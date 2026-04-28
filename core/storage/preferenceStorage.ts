
class PreferenceStorage {
  static getLang(): string {
    if (typeof window === 'undefined') return 'zh-CN'
    return localStorage.getItem('lang') ?? 'zh-CN'
  }
  static setLang(lang: string) {
    if (typeof window === 'undefined') return
    localStorage.setItem('lang', lang)
  }
}

export default PreferenceStorage
