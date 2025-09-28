# Prensesi Koru – Arda Yağcı

Prensesi Koru, MediaPipe Hands ile gerçek zamanlı el takibi ve Three.js ile 2D/3D sahne render’ı kullanarak tarayıcıda oynanan, sürükleyici bir refleks oyunudur. Amacın, elinle kontrol ettiğin mavi ateş topu ile prensesi yaklaşan düşmanlardan korumak.

> Hacettepe AI Club için hazırlanmıştır.

---

## İçindekiler
- [Öne Çıkanlar](#öne-çıkanlar)
- [Teknolojiler](#teknolojiler)
- [Kurulum](#kurulum)
- [Geliştirme ve Çalıştırma](#geliştirme-ve-çalıştırma)
- [Nasıl Oynanır](#nasıl-oynanır)
- [Oyun Mekanikleri](#oyun-mekanikleri)
- [Zorluk Sistemi](#zorluk-sistemi)
- [Performans ve Kamera Optimizasyonu](#performans-ve-kamera-optimizasyonu)
- [Lisans ve Teşekkür](#lisans-ve-teşekkür)

---

## Öne Çıkanlar
- Gerçek zamanlı el takibi (MediaPipe Hands) – avuç içi referans noktası ile stabil kontrol
- Three.js ile şeffaf arkaplanda sahne – kamera görüntüsü üzerinde oyun nesneleri
- Dinamik zorluk – skor arttıkça düşman hızı ve spawn sıklığı artar
- Pausa devam ve ana menüye dön – modern, animasyonlu UI/UX
- LocalStorage tabanlı liderlik tablosu – en iyi skorlar kaydedilir
- Hata yönetimi ve kamera erişim fallback’leri


## Teknolojiler
- Vite + TypeScript
- Three.js
- MediaPipe Hands
- Modern CSS 

## Kurulum
```bash
npm install
```
> Node.js 18+ önerilir.

## Geliştirme ve Çalıştırma
```bash
# Geliştirme sunucusu
npm run dev

# Prod build
npm run build

Tarayıcı genellikle `http://localhost:5173` adresini açacaktır.

## Nasıl Oynanır
1. Giriş ekranında kullanıcı adını gir ve “Oyuna Başla”ya tıkla.
2. Tarayıcı kamerana erişim izni ver.
3. Elini kamera karşısında hareket ettir; mavi ateş topu el hareketini takip eder.
4. Prensesi düşmanlardan koru. Düşmanların üstüne gelince yok olurlar ve skor kazanırsın.
5. Düşman prenses’e ulaşırsa oyun biter. Skorun liderlik tablosuna kaydedilir.

### Kontroller
- El hareketi: Oyuncu ateş topunu yönlendirir.
- Duraklat: Sağ üst köşedeki “Duraklat”.
- Devam: Pausa ekranındaki “Devam Et”.
- Ana Menü: Pausa ekranındaki “Ana Menüye Dön”.

## Oyun Mekanikleri
- Oyuncu: Mavi ateş topu (el hareketi ile konumlandırılır)
- Prenses: Sahnenin merkezinde sabit
- Düşmanlar: Ekranın kenarlarından rastgele doğar ve prensese doğru hareket eder
- Çarpışma: Oyuncu-düşman çarpışması → düşman yok olur, +50 puan
- Prenses-düşman çarpışması → oyun biter

## Zorluk Sistemi
Skora göre dinamik olarak:
- Düşman hızı artar
- Düşman doğma aralığı kısalır 

Bu sistem, oyunu başta erişilebilir tutarken ilerledikçe rekabetçi hale getirir.

## Performans ve Kamera Optimizasyonu
- Cihaz türüne göre çözünürlük ve kare hızı seçimi (mobil/masaüstü dengesi)
- MediaPipe `modelComplexity: 1` ile avuç içi takibinde stabilite
- `selfieMode: true` (ön kamera için doğru ayna görüntüsü)
- Hata durumlarında sade fallback kısıtlamaları
- Şeffaf WebGL canvas ile kamera üstüne overlay


## Sorun Giderme
- Kamera izni reddedildi: Tarayıcı ayarlarından siteye kamera erişimi verin ve sayfayı yenileyin.
- Kamera başka uygulama tarafından kullanılıyor: Diğer uygulamaları kapatın (Zoom, Teams vb.) ve sayfayı yenileyin.
- Görüntü siyah: Güvenlik ayarları, cihaz sürücüsü ya da HTTPS gereksinimi olabilir; farklı bir tarayıcı deneyin.
- Performans düşük: Arka plan uygulamalarını kapatın, ışık koşullarını iyileştirin; mobilde tarayıcıyı güncelleyin.


## Katkıda Bulunma
- Hata/öneriler için Issue açabilirsiniz.
- Yeni özellikler için PR’lar memnuniyetle karşılanır.

## Lisans ve Teşekkür
Bu proje eğitim/demonstrasyon amaçlıdır.

**Hazırlayan:** Arda Yağcı – Yapay Zeka Mühendisliği 1. Sınıf Öğrencisi  
**Topluluk:** Hacettepe AI Club

— İyi eğlenceler! 🎮🔥
