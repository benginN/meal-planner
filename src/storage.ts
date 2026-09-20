// Safari'de "tüm çerezleri engelle" açıkken ya da bazı gömülü tarayıcılarda localStorage'a
// dokunmak bile SecurityError fırlatır; bu ilk çizimde olursa uygulama bomboş (siyah) ekranda kalır.
// Tercihleri saklayamamak uygulamayı düşürmemeli.
export const store = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* saklanamadıysa bu oturumluk geçerli olur */
    }
  },
};
