# 🛡️ İSG Takip Pro - Masaüstü Yönetim Sistemi

![Version](https://img.shields.io/badge/version-2.2.1-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-Windows-lightgrey.svg)
![Tech](https://img.shields.io/badge/tech-Electron%20%7C%20React%20%7C%20TypeScript-informational)

**İSG Takip Pro**, İş Sağlığı ve Güvenliği (İSG) uzmanları ve Ortak Sağlık Güvenlik Birimleri (OSGB) için geliştirilmiş; firma, personel, eğitim, ekipman ve risk analizi süreçlerini tek bir merkezden yönetmeyi sağlayan modern bir masaüstü uygulamasıdır.

---

## 📸 Ekran Görüntüleri

<!-- Projenizden ekran görüntülerini buraya ekleyebilirsiniz -->
<div align="center">
  <img src="https://via.placeholder.com/800x450.png?text=Dashboard+Ekranı" alt="Dashboard" width="800" />
</div>

---

## 🚀 Öne Çıkan Özellikler

### 📊 1. Akıllı Dashboard & Uyarı Sistemi
Uygulama açılışında sizi karşılayan özet ekranı sayesinde hiçbir aksiyonu kaçırmazsınız:
*   🔴 **Acil İşlemler:** Süresi dolmuş risk analizleri, eğitimler veya toplantılar.
*   🟡 **Yaklaşan İşlemler:** 30 gün içinde süresi dolacak olan kayıtlar.
*   🔵 **Onay Bekleyenler:** Sekreter veya asistan tarafından girilen, uzman onayı bekleyen kayıtlar.

### 🏢 2. Kapsamlı Takip Modülleri
*   **Firma Yönetimi:** Sınırsız firma ekleme, tehlike sınıfı belirleme (Az Tehlikeli, Tehlikeli, Çok Tehlikeli).
*   **Personel & Eğitim:** Çalışan takibi ve tehlike sınıfına göre otomatik hesaplanan eğitim periyotları.
*   **Ekipman Kontrolü:** İş ekipmanlarının periyodik kontrol takibi.
*   **Risk Analizi:** Analiz geçerlilik sürelerinin otomatik takibi.
*   **Kurul Toplantıları:** Mevzuata uygun periyotlarda toplantı planlama.

### 🖨️ 3. Raporlama
*   **Haftalık & Aylık Plan:** Seçilen tarih aralığı için yapılacak işleri listeler.
*   **Otomatik Yazdırma:** Yazıcı ön izlemesi ile raporları doğrudan kâğıda dökme imkanı.

### 🔐 4. Rol Tabanlı Yetkilendirme (RBAC)
*   **Admin:** Tam yetki.
*   **Sekreter:** Veri girişi yapar, silme yetkisi yoktur.
*   **Kullanıcı:** Sadece atanan firmaları görür.

---

## 🛠️ Kullanılan Teknolojiler

Bu proje modern web teknolojilerinin gücünü masaüstüne taşır:

*   **Çekirdek:** [Electron.js](https://www.electronjs.org/)
*   **Arayüz:** [React](https://react.dev/) + [Vite](https://vitejs.dev/)
*   **Dil:** [TypeScript](https://www.typescriptlang.org/)
*   **Stil:** [Tailwind CSS](https://tailwindcss.com/)
*   **İkonlar:** [FontAwesome](https://fontawesome.com/)
*   **Veri Saklama:** Yerel JSON Depolama (electron-store / local-fs)
*   **Raporlama:** jsPDF & jspdf-autotable

---

## ⚙️ Kurulum ve Çalıştırma

Projeyi yerel bilgisayarınızda çalıştırmak için aşağıdaki adımları izleyin.

### Gereksinimler
*   Node.js (v16 veya üzeri)
*   Git

### Adımlar

1.  **Projeyi Klonlayın:**
    ```bash
    git clone https://github.com/KULLANICI_ADINIZ/isg-takip-pro.git
    cd isg-takip-pro
    ```

2.  **Bağımlılıkları Yükleyin:**
    ```bash
    npm install
    ```

3.  **Geliştirme Modunda Çalıştırın:**
    ```bash
    # Terminal 1: Vite Sunucusu
    npm run dev

    # Terminal 2: Electron Penceresi
    npm start
    ```

4.  **Windows (.exe) Uygulaması Oluşturun:**
    ```bash
    npm run dist
    ```
    *Oluşturulan `.exe` dosyası `release` klasöründe yer alacaktır.*

---

## 🔑 Varsayılan Giriş Bilgileri

Uygulama yerel veritabanı kullandığı için ilk açılışta aşağıdaki yönetici hesabı ile giriş yapabilirsiniz:

| Rol | Kullanıcı Adı | Şifre |
| :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` |

*> Not: Ayarlar menüsünden şifrenizi değiştirebilir veya yeni kullanıcılar ekleyebilirsiniz.*

---

## ⚖️ Yasal Süre Hesaplamaları (Otomasyon)

Sistem, Türk İSG mevzuatına uygun olarak geçerlilik sürelerini otomatik hesaplar:

| Tehlike Sınıfı | Risk Analizi | İSG Eğitimi | Kurul Toplantısı |
| :--- | :---: | :---: | :---: |
| 🔥 **Çok Tehlikeli** | 2 Yıl | 1 Yıl | Her Ay |
| ⚠️ **Tehlikeli** | 4 Yıl | 2 Yıl | 2 Ayda Bir |
| ✅ **Az Tehlikeli** | 6 Yıl | 3 Yıl | 3 Ayda Bir |

---

## 🤝 Katkıda Bulunma

1.  Bu projeyi Fork'layın.
2.  Yeni bir özellik dalı (branch) oluşturun (`git checkout -b feature/YeniOzellik`).
3.  Değişikliklerinizi Commit'leyin (`git commit -m 'Yeni özellik eklendi'`).
4.  Dalınızı Push'layın (`git push origin feature/YeniOzellik`).
5.  Bir Pull Request oluşturun.

---

## 📄 Lisans

Bu proje [MIT License](LICENSE) altında lisanslanmıştır.