
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Firma, Calisan, Ekipman, RiskAnalizi, KurulToplantisi } from '../types';
import { formatDateTR } from './logic';

interface ReportItem {
    type: string;
    name: string;
    detail: string;
    date: string;
    status: 'EXPIRED' | 'PLANNED';
}

// Türkçe karakterleri güvenli ASCII formatına çevirir
const trToAscii = (text: string): string => {
    if (!text) return "";
    return text
        .replace(/Ğ/g, "G").replace(/ğ/g, "g")
        .replace(/Ü/g, "U").replace(/ü/g, "u")
        .replace(/Ş/g, "S").replace(/ş/g, "s")
        .replace(/İ/g, "I").replace(/ı/g, "i")
        .replace(/Ö/g, "O").replace(/ö/g, "o")
        .replace(/Ç/g, "C").replace(/ç/g, "c");
};

// Browser compatible ArrayBuffer to Base64
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
};

export const ReportService = {
    
    // Otomatik Yazdırma İçin Haftalık Plan (Gelecek Hafta)
    printNextWeekPlan: async (
        data: { firms: Firma[], employees: Calisan[], equipments: Ekipman[], risks: RiskAnalizi[], meetings?: KurulToplantisi[] }
    ) => {
        const today = new Date();
        // Bir sonraki haftanın Pazartesi gününü bul
        const nextMonday = new Date(today);
        nextMonday.setDate(today.getDate() + ((7 - today.getDay()) % 7) + 1);
        
        // Bir sonraki haftanın Pazar gününü bul
        const nextSunday = new Date(nextMonday);
        nextSunday.setDate(nextMonday.getDate() + 6);

        const label = `${formatDateTR(nextMonday.toISOString())} - ${formatDateTR(nextSunday.toISOString())}`;
        
        // Raporu oluştur ve otomatik yazdır modunda aç
        await ReportService.generateReport(
            'Otomatik Haftalık Plan', 
            label, 
            nextMonday, 
            nextSunday, 
            data
        );
    },

    generateReport: async (
        title: string, 
        periodLabel: string, 
        startDate: Date, 
        endDate: Date,
        data: { firms: Firma[], employees: Calisan[], equipments: Ekipman[], risks: RiskAnalizi[], meetings?: KurulToplantisi[] },
        autoPrint: boolean = true // Varsayılan olarak true yapıldı, ama alttaki kod zaten zorlayacak
    ) => {
        // 1. AYAR: Sayfa YATAY (Landscape) olsun
        const doc = new jsPDF({ orientation: 'landscape' });
        let useCustomFont = false;

        // --- FONT YÜKLEME ---
        try {
            const fontUrl = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf';
            const fontBytes = await fetch(fontUrl).then(res => res.arrayBuffer());
            const fileName = 'Roboto-Regular.ttf';
            doc.addFileToVFS(fileName, arrayBufferToBase64(fontBytes));
            doc.addFont(fileName, 'Roboto', 'normal');
            doc.setFont('Roboto');
            useCustomFont = true;
        } catch (e) {
            console.warn("Font yüklenemedi.", e);
        }

        const txt = (text: string) => useCustomFont ? text : trToAscii(text);

        // --- VERİ HAZIRLIĞI ---
        const todayStr = new Date().toISOString().split('T')[0];
        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];

        const checkStatus = (dateStr: string): 'EXPIRED' | 'PLANNED' | null => {
            if (!dateStr) return null;
            if (dateStr < todayStr) return 'EXPIRED'; 
            if (dateStr >= startStr && dateStr <= endStr) return 'PLANNED'; 
            return null;
        };

        // Tek bir tablo gövdesi oluşturacağız (Excel mantığı)
        const tableBody: any[] = [];
        let totalActionCount = 0;
        let activeFirmCount = 0;

        // Firmaları isme göre sırala
        const sortedFirms = [...data.firms].sort((a, b) => a.ad.localeCompare(b.ad));

        sortedFirms.forEach(firm => {
            const items: ReportItem[] = [];

            // A) Çalışanlar
            data.employees.filter(e => e.firmaId === firm.id).forEach(emp => {
                if (emp.calismaDurumu === 'AYRILDI' || emp.onayDurumu === 'BEKLIYOR') return;
                const status = checkStatus(emp.sonrakiEgitimTarihi);
                if (status) {
                    items.push({ type: 'Eğitim', name: emp.adSoyad, detail: emp.tcNo ? `TC: ${emp.tcNo}` : '-', date: emp.sonrakiEgitimTarihi, status });
                }
            });

            // B) Ekipmanlar
            data.equipments.filter(e => e.firmaId === firm.id).forEach(eq => {
                const status = checkStatus(eq.sonrakiKontrolTarihi);
                if (status) {
                    items.push({ type: 'Ekipman', name: eq.ad, detail: `${eq.periyotAy} Aylık`, date: eq.sonrakiKontrolTarihi, status });
                }
            });

            // C) Risk Analizi
            data.risks.filter(r => r.firmaId === firm.id).forEach(r => {
                const status = checkStatus(r.gecerlilikTarihi);
                if (status) {
                    items.push({ type: 'Risk', name: 'Risk Analizi', detail: 'Firma Geneli', date: r.gecerlilikTarihi, status });
                }
            });

            // D) Kurul Toplantısı
            if (data.meetings) {
                data.meetings.filter(m => m.firmaId === firm.id).forEach(m => {
                    const status = checkStatus(m.sonrakiToplantiTarihi);
                    if(status) {
                         items.push({ type: 'Kurul', name: 'Kurul Toplantısı', detail: `${m.periyotAy} Ayda Bir`, date: m.sonrakiToplantiTarihi, status });
                    }
                });
            }

            // Eğer firmada işlem varsa listeye ekle
            if (items.length > 0) {
                activeFirmCount++;
                totalActionCount += items.length;

                // Önce Gecikmişler
                items.sort((a, b) => {
                    if (a.status === 'EXPIRED' && b.status !== 'EXPIRED') return -1;
                    if (a.status !== 'EXPIRED' && b.status === 'EXPIRED') return 1;
                    return a.date.localeCompare(b.date);
                });

                // 1. GRUP BAŞLIĞI SATIRI (Firma Adı)
                // colSpan: 5 (Tüm sütunları kapla)
                tableBody.push([{
                    content: txt(`${firm.ad}  -  (${firm.tehlikeSinifi})`),
                    colSpan: 5,
                    styles: { 
                        fillColor: [240, 240, 240], // Açık gri
                        textColor: [0, 0, 0],
                        fontStyle: 'bold',
                        halign: 'left',
                        cellPadding: 1.5 // Sıkıştırılmış
                    }
                }]);

                // 2. İŞLEM SATIRLARI
                items.forEach(item => {
                    tableBody.push([
                        item.status === 'EXPIRED' ? txt('GECİKMİŞ') : txt('PLANLI'),
                        formatDateTR(item.date),
                        txt(item.type),
                        txt(item.name),
                        txt(item.detail)
                    ]);
                });
            }
        });

        // --- PDF ÇİZİMİ ---
        const pageWidth = doc.internal.pageSize.width; // 297mm
        
        // Üst Şerit
        doc.setFillColor(33, 37, 41); // Koyu Gri
        doc.rect(0, 0, pageWidth, 18, 'F');

        // Başlıklar
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont(useCustomFont ? 'Roboto' : 'helvetica', 'bold');
        doc.text(txt("İSG OPERASYON LİSTESİ"), 10, 11);
        
        doc.setFontSize(9);
        doc.setFont(useCustomFont ? 'Roboto' : 'helvetica', 'normal');
        doc.text(txt(`${title}  |  ${periodLabel}`), pageWidth - 10, 11, { align: 'right' });

        // İstatistik Satırı
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(8);
        doc.text(txt(`Rapor Tarihi: ${formatDateTR(todayStr)}  |  Firma Sayısı: ${activeFirmCount}  |  Toplam İşlem: ${totalActionCount}`), 10, 24);

        if (tableBody.length === 0) {
            doc.setFontSize(12);
            doc.text(txt("Bu dönem için görüntülenecek veri bulunamadı."), 10, 35);
        } else {
            // TABLO ÇİZİMİ
            autoTable(doc, {
                startY: 26,
                head: [[txt('DURUM'), txt('TARİH'), txt('TÜR'), txt('KONU / İSİM'), txt('DETAY')]],
                body: tableBody,
                theme: 'plain', // Grid yerine Plain (daha temiz)
                styles: {
                    font: useCustomFont ? 'Roboto' : 'helvetica',
                    fontSize: 8, // Küçük font
                    cellPadding: 1.2, // Çok az boşluk
                    textColor: 50,
                    overflow: 'linebreak',
                    lineWidth: 0.1,
                    lineColor: [220, 220, 220] // Çok silik çizgiler
                },
                headStyles: {
                    fillColor: [52, 58, 64], // Header koyu
                    textColor: 255,
                    fontSize: 8,
                    fontStyle: 'bold',
                    cellPadding: 2
                },
                columnStyles: {
                    0: { cellWidth: 20, fontStyle: 'bold' }, // Durum
                    1: { cellWidth: 22, halign: 'center' },  // Tarih
                    2: { cellWidth: 25 }, // Tür
                    3: { cellWidth: 'auto' }, // İsim
                    4: { cellWidth: 60 }  // Detay
                },
                didParseCell: (data) => {
                    // Gecikmiş işleri Kırmızı yap
                    if (data.section === 'body') {
                        // Eğer bu bir başlık satırı değilse (yani normal veri ise)
                        // @ts-ignore
                        if (!data.row.raw[0].content) { 
                            if (data.row.raw[0] === txt('GECİKMİŞ')) {
                                data.cell.styles.textColor = [220, 38, 38]; // Kırmızı
                            }
                        }
                    }
                },
                margin: { left: 10, right: 10, bottom: 10 }
            });
        }

        // Sayfa Numaraları
        const pageCount = doc.getNumberOfPages();
        for(let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(7);
            doc.setTextColor(150);
            doc.text(`${i} / ${pageCount}`, pageWidth - 10, doc.internal.pageSize.height - 5, { align: 'right' });
        }

        // İNDİRME YERİNE DOĞRUDAN YAZDIRMA PENCERESİ AÇ
        // doc.save(...) kaldırıldı.
        
        doc.autoPrint(); // Yazdır komutunu PDF içine gömer
        
        // Blob URL oluşturup yeni pencerede aç
        const blobUrl = doc.output('bloburl');
        window.open(blobUrl, '_blank');
    }
};
