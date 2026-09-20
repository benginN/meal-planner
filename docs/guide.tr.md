# 🍲 Yemek Planlayıcı

Haftalık yemek planını sürükle-bırak ile kurduğun, alışveriş listesinin plandan kendiliğinden çıktığı, kendi sunucunda çalışan küçük bir uygulama. Bu rehber uygulamanın içinde de başlıktaki **Rehber** butonundan açılır. Kurulum, Glance ve geliştirici notları depodaki `README.md` dosyasındadır (İngilizce).

## Ekran düzeni

Ekran üç sütundan oluşur. Telefonda bu sütunlar alttaki **Tarifler / Plan / Alışveriş** sekmelerine dönüşür.

| Sütun | Ne işe yarar |
|---|---|
| **Sol – Tarifler** | Bütün tarifler. Arama kutusu tarif adına, etikete ve malzemeye bakar ("tavuk" yazınca tavuklu her şey gelir). **Filtreler** butonu kategori ve etiket seçeneklerini açıp kapatır; kapalıyken seçili filtre butonun üzerinde yazar. |
| **Orta – Haftalık plan** | 7 gün × kahvaltı/öğle/akşam. Tarifleri buraya taşırsın. |
| **Sağ – Alışveriş** | Plandaki yemeklerin malzemeleri, porsiyona göre hesaplanmış ve reyonlara ayrılmış halde. |

Başlıktaki dil menüsü her şeyi Türkçe, English ve Deutsch arasında değiştirir: arayüz, rehber, tarif adları, malzemeler, yapılışlar ve alışveriş listesi. Hazır gelen tariflerin üç dilde de çevirisi vardır. Kendi eklediğin bir tarifin çevirisi yoksa diğer dillerde yazdığın haliyle görünür.

## Plan yapmak

- **Yemek eklemek:** Soldaki tarifi tutup istediğin günün kahvaltı, öğle ya da akşam kutusuna bırak. Bir kutuya birden fazla yemek konabilir (çorba + ana yemek gibi).
- **Telefonda:** Plandaki bir öğünün **+** işaretine dokun, açılan tarif listesinden seç; tarif doğrudan o öğüne eklenir. Ya da tarife dokun, açılan pencerede gün ve öğünü seçip **Plana ekle**'ye bas. (Basılı tutarak sürüklemek de çalışır.)
- **Taşımak:** Plandaki yemeği tutup başka bir kutuya bırak.
- **Porsiyon:** Yemeğin altındaki **− / +** kaç kişilik pişeceğini belirler. Alışveriş listesi anında güncellenir. 1'in altına inince yarım porsiyona düşer.
- **Çıkarmak:** Yemeğin sağındaki **×**.
- **Tarife bakmak:** Yemeğin adına tıkla; malzemeler, yapılışı ve porsiyon başına besin değerleri açılır. Oradaki − / + sadece o pencerede miktarları ölçekler, planı değiştirmez.
- **Günlük toplam:** Gün adının altındaki `kcal · g P` satırı, o günün her yemeğinden birer porsiyon yiyen bir kişinin alacağı kalori ve proteindir (porsiyon sayısından etkilenmez).

## Haftalar

- Başlıktaki **‹ ›** okları haftalar arasında gezdirir; **Bu haftaya dön** bugüne getirir. Bugünün satırı renkli çizgiyle işaretlidir.
- Her hafta kendiliğinden kayıtlıdır, ayrıca "kaydet" demene gerek yok.
- **Kayıtlı haftalar** menüsü içinde yemek olan eski haftaları listeler.
- Boş bir haftadayken çıkan **Haftadan kopyala…** menüsü eski bir haftanın planını olduğu gibi bu haftaya getirir.
- **Temizle** o haftanın planını siler.

## Alışveriş listesi

- Aynı malzeme farklı tariflerde geçiyorsa tek satırda toplanır. Gram/kilo ve ml/litre birbirine çevrilir; çevrilemeyenler yan yana yazılır (`30 g + 2 yemek kaşığı`).
- Miktarı olmayan ("göz kararı") malzemeler sadece adıyla görünür.
- **Kutucuk:** Aldıkça işaretle. Üstteki sayaç kaç kalemin bittiğini gösterir.
- **⋯ menüsü:**
  - *Evde var, listeden çıkar* – sadece bu hafta için listeden düşer, altta "Evde var" bölümünde durur ve geri alınabilir.
  - *Temel malzeme yap* – tuz, yağ, baharat gibi evde hep bulunanlar. Bunlar her hafta gizlidir; listenin altındaki **Temel malzemeleri göster** ile görünür olur.
  - *Reyon* – malzeme yanlış reyondaysa buradan düzeltilir, kalıcıdır.
- **Ekstra:** Yemekle ilgisi olmayan şeyleri (peçete, deterjan…) alttaki kutudan eklersin.

## Tarif eklemek ve düzenlemek

- **+ Yeni** ile yeni tarif; bir tarifi açıp **Düzenle** ile değişiklik.
- **Kaç kişilik** alanı önemlidir: porsiyon hesabı buna göre yapılır.
- Besin değerleri (kcal, protein, karbonhidrat, yağ) porsiyon başınadır ve opsiyoneldir.
- Malzeme satırında miktarı boş bırakırsan "göz kararı" sayılır ve ölçeklenmez.
- Malzeme adını yazarken çıkan önerilerden seçmeye çalış: "soğan" ve "kuru soğan" ayrı yazılırsa listede de ayrı satır olur.
- **Diller:** Form o an seçili dildeki metni düzenler. Bir tarifin Almancasını yazmak için dili Deutsch yapıp tarifi düzenle; Türkçesi olduğu gibi kalır. Miktarlar, birimler ve besin değerleri bütün dillerde ortaktır. Malzeme hangi dilde yazılırsa yazılsın aynı malzemeye bağlanır.
- Tarifi silmek onu bütün planlardan da kaldırır.

## Profiller

Sağ üstteki menüden profil seçilir, **⚙** ile profil eklenir, adı/rengi değiştirilir ya da silinir.

- **Tarifler herkes için ortaktır.**
- **Plan ve alışveriş listesi profile özeldir.** Birlikte plan yapacaksanız ikiniz de "Ortak" profilini kullanın; kendi planın için ayrı profil aç.
- Şifre yoktur; uygulamanın sadece güvendiğin ağdan (Tailscale gibi) erişilebilir olması beklenir.
- Aynı profile iki kişi aynı anda bakıyorsa değişiklikler en geç 15 saniyede karşı tarafa yansır.

## PDF

**PDF / Yazdır** butonu haftalık plan tablosu + alışveriş listesinden oluşan A4 sayfayı hazırlar; yazdırma penceresinde hedef olarak "PDF olarak kaydet" seç. Temel malzemeler ve "evde var" dediklerin PDF'e girmez.
