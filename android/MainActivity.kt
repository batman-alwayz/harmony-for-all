class MainActivity : AppCompatActivity() {
  private lateinit var web: WebView

  @SuppressLint("SetJavaScriptEnabled")
  override fun onCreate(b: Bundle?) {
    super.onCreate(b)
    web = WebView(this)
    setContentView(web)
    web.settings.javaScriptEnabled = true
    web.settings.domStorageEnabled = true
    web.settings.mediaPlaybackRequiresUserGesture = false
    web.webChromeClient = object : WebChromeClient() {}
    web.webViewClient = object : WebViewClient() {
      override fun shouldInterceptRequest(v: WebView, r: WebResourceRequest): WebResourceResponse? {
        val h = r.url.host ?: return null
        if (h.contains("doubleclick") || h.contains("googlesyndication") || r.url.path?.contains("/pagead/") == true) {
          return WebResourceResponse("text/plain", "utf-8", ByteArrayInputStream(ByteArray(0)))
        }
        return null
      }
      override fun onPageFinished(v: WebView, url: String) {
        v.evaluateJavascript(AD_SKIP_JS, null)
      }
    }
    web.addJavascriptInterface(Bridge(), "NativeBridge")
    web.loadUrl("https://room.example.workers.dev/")
    startService(Intent(this, PlaybackService::class.java))
  }

  inner class Bridge {
    @JavascriptInterface fun position(): Double = PlaybackService.pos()
    @JavascriptInterface fun seek(ms: Double) { PlaybackService.seek(ms.toLong()) }
    @JavascriptInterface fun load(id: String, ms: Double) {
      runOnUiThread { web.loadUrl("https://music.youtube.com/watch?v=$id") }
    }
    @JavascriptInterface fun pause() { PlaybackService.pause() }
  }

  companion object {
    const val AD_SKIP_JS = """
      setInterval(function(){
        var v=document.querySelector('video');
        var ad=document.querySelector('.ad-showing')||document.querySelector('.ytp-ad-player-overlay');
        if(ad&&v&&v.duration>1){v.currentTime=v.duration-0.1;}
      },400);
      setInterval(function(){
        var v=document.querySelector('video');
        if(v) window.NativeBridge && (window.__pos = v.currentTime*1000);
      },500);
    """
  }
}
