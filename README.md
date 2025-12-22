# Mirza Admin Panel

Mirza araç kiralama mobil uygulaması için yönetim paneli. Bu panel, mobil uygulama ile aynı Supabase backend'ini kullanır ve yöneticilerin (admin/personnel) müşteri, araç, kampanya, belge ve talep yönetimi yapmasını sağlar.

## Özellikler

- 🔐 **Güvenli Giriş**: Supabase Auth ile email/şifre girişi, sadece admin ve personnel rolleri kabul edilir
- 📊 **Dashboard**: Genel istatistikler ve son talepler özeti
- 👥 **Müşteri Yönetimi**: Müşteri listesi, detay görüntüleme ve düzenleme
- 🚗 **Araç Yönetimi**: Araç filosu CRUD işlemleri, kiralama ve servis geçmişi takibi
- 📢 **Kampanya Yönetimi**: Kampanya oluşturma, düzenleme, aktif/pasif yapma
- 📄 **Belge Yönetimi**: Müşterilere belge ekleme ve listeleme
- 💬 **Talep Yönetimi**: Müşteri taleplerini görüntüleme, yanıtlama ve durum güncelleme
- 🔧 **Servis Geçmişi**: Araç bakım ve onarım kayıtları

## Yetki Sistemi

| Rol | Yetkiler |
|-----|----------|
| **Admin** | Tüm CRUD işlemleri, silme dahil |
| **Personnel** | Görüntüleme, ekleme, düzenleme (silme kısıtlı - sadece kampanyalarda) |

## Teknoloji Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: TailwindCSS + shadcn/ui
- **State Management**: Zustand
- **Backend**: Supabase (Auth, Database)
- **Language**: TypeScript

## Kurulum

1. Bağımlılıkları yükleyin:
```bash
npm install
```

2. `.env.example` dosyasını `.env.local` olarak kopyalayın ve Supabase bilgilerinizi girin:
```bash
cp .env.example .env.local
```

3. `.env.local` dosyasını düzenleyin:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

4. Geliştirme sunucusunu başlatın:
```bash
npm run dev
```

5. Tarayıcınızda [http://localhost:3000](http://localhost:3000) adresine gidin.

## Sayfa Yapısı

```
/                    - Dashboard (istatistikler, son talepler)
/login               - Giriş sayfası
/customers           - Müşteri listesi
/customers/[id]      - Müşteri detayı
/vehicles            - Araç listesi
/vehicles/[id]       - Araç detayı
/campaigns           - Kampanya yönetimi
/documents           - Belge yönetimi
/requests            - Talep listesi
/requests/[id]       - Talep detayı ve yanıtlama
/service-history     - Servis geçmişi
```

## Veritabanı Şeması

Bu panel aşağıdaki Supabase tablolarını kullanır:
- `profiles` - Kullanıcı profilleri (role: admin/personnel/customer)
- `vehicles` - Araç bilgileri
- `customer_vehicles` - Kiralama kayıtları
- `campaigns` - Kampanyalar
- `documents` - Müşteri belgeleri
- `requests` - Müşteri talepleri
- `request_responses` - Talep yanıtları
- `service_history` - Araç servis geçmişi

## Deploy

Vercel'e deploy etmek için:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. GitHub reponuzu bağlayın
2. Environment variable'ları ekleyin
3. Deploy edin
