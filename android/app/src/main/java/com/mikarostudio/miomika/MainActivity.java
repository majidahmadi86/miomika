package com.mikarostudio.miomika;

import android.webkit.CookieManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onPause() {
        super.onPause();
        // Persist WebView cookies to disk the moment the app leaves the
        // foreground. Android flushes them lazily, so a swipe-kill could lose
        // session cookies written since the last flush — that was the
        // "logged out every time I close the app" bug. One flush here makes
        // the session survive process death like a real mobile application.
        try {
            CookieManager.getInstance().flush();
        } catch (Exception ignored) {
            // Cookie persistence is best-effort; never crash the pause path.
        }
    }
}
