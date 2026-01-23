
# İSG Takip Pro - Profesyonel Masaüstü Yönetim Sistemi

Bu proje, İş Sağlığı ve Güvenliği (İSG) uzmanları ve Ortak Sağlık Güvenlik Birimleri (OSGB) için geliştirilmiş; firma, personel, eğitim, ekipman, kurul toplantıları ve risk analizi süreçlerini tek bir merkezden yönetmeyi sağlayan kapsamlı bir masaüstü uygulamasıdır.

## 🚀 Öne Çıkan Özellikler

### 1. Kapsamlı Takip Modülleri
*   **Firma Yönetimi:** Sınırsız sayıda firma ekleyin, tehlike sınıflarını (Az Tehlikeli, Tehlikeli, Çok Tehlikeli) belirleyin.
*   **Personel Eğitim Takibi:** Çalışanların eğitim tarihlerini girin, sistem bir sonraki eğitimi tehlike sınıfına göre otomatik hesaplasın.
*   **Ekipman Periyodik Kontrolleri:** İş ekipmanlarının (Forklift, Vinç, Basınçlı Kaplar vb.) kontrol periyotlarını ve gelecek kontrol tarihlerini takip edin.
*   **Risk Analizi Takibi:** Risk analizlerinin geçerlilik sürelerini otomatik izleyin.
*   **İSG Kurul Toplantıları:** Tehlike sınıfına göre (1, 2 veya 3 ayda bir) kurul toplantı tarihlerini planlayın ve takip edin.

### 2. Akıllı Uyarı Sistemi (Dashboard)
Uygulama açılışında ve ana ekranda sizi karşılayan akıllı dashboard sayesinde hiçbir işlemi kaçırmazsınız:
*   **Süresi Dolanlar (Kırmızı):** Acil işlem yapılması gereken kayıtlar.
*   **Yaklaşanlar (Sarı):** 30 gün içinde süresi dolacak olan kayıtlar.
*   **Onay Bekleyenler (Mavi):** Sekreter tarafından eklenen ve uzman onayı bekleyen personel kayıtları.

### 3. Rol Tabanlı Yetkilendirme (RBAC)
Uygulama farklı kullanıcı seviyelerini destekler:
*   **Yönetici (ADMIN):** Tam yetkiye sahiptir. Kullanıcı oluşturur, firmaları siler, tüm verileri yönetir.
*   **İSG Uzmanı (USER):** Sadece kendisine atanan firmaları görür. Veri girişi yapar, onay bekleyen kayıtları onaylar.
*   **Sekreter (SECRETARY):** Tüm firmaları görebilir. Veri girişi yapabilir ancak silme yetkisi yoktur. Eklediği kayıtlar "Onay Bekliyor" statüsüne düşer.

### 4. Raporlama
*   **Haftalık Rapor:** Seçilen hafta için planlanan tüm işleri PDF olarak dökün.
*   **Aylık Rapor:** Ay bazında firma firma yapılacak işler listesini (Eğitim, Ekipman, Risk, Kurul) PDF formatında alın.
*   **Otomatik Raporlama:** Ayarlanan gün ve saatte (örn: Cuma 17:00) gelecek haftanın planını otomatik olarak yazıcıya gönderir (Simülasyon).

### 5. Yasal Süre Hesaplamaları
Sistem, İSG mevzuatına uygun olarak geçerlilik sürelerini otomatik hesaplar:

| Tehlike Sınıfı | Risk Analizi | İSG Eğitimi | Kurul Toplantısı |
| :--- | :---: | :---: | :---: |
| **Çok Tehlikeli** | 2 Yıl | 1 Yıl | Her Ay |
| **Tehlikeli** | 4 Yıl | 2 Yıl | 2 Ayda Bir |
| **Az Tehlikeli** | 6 Yıl | 3 Yıl | 3 Ayda Bir |

---

## 🛠 Kurulum ve Teknik Detaylar

Bu proje **Electron.js**, **React** ve **Tailwind CSS** kullanılarak geliştirilmiştir. Veriler yerel bilgisayarda JSON formatında güvenli bir şekilde saklanır.

1.  **Kurulum:**
    ```bash
    npm install
    ```

2.  **Geliştirici Modu (Dev):**
    ```bash
    npm run dev
    # Ayrı bir terminalde:
    npm start
    ```

3.  **Uygulama Oluşturma (.exe):**
    ```bash
    npm run build
    ```

---

## 🔐 Varsayılan Giriş Bilgileri

Uygulama ilk kurulduğunda aşağıdaki yönetici hesabı ile giriş yapabilirsiniz:

*   **Kullanıcı Adı:** `admin`
*   **Şifre:** `admin123`

*Not: Ayarlar menüsünden tüm verilerinizi "Yedek Al" butonu ile bilgisayarınıza indirebilir ve başka bir bilgisayara taşıyabilirsiniz.*
