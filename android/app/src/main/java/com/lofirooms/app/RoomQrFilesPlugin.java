package com.lofirooms.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.OutputStream;

// Save a QR PNG through Android's document picker, matching the letter export.
// This grants access only to the chosen document; no storage permission needed.
@CapacitorPlugin(name = "RoomQrFiles")
public class RoomQrFilesPlugin extends Plugin {
    @PluginMethod
    public void save(PluginCall call) {
        if (call.getString("base64") == null) { call.reject("A PNG is required"); return; }
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("image/png");
        intent.putExtra(Intent.EXTRA_TITLE, call.getString("filename", "lofi-room-qr.png"));
        startActivityForResult(call, intent, "saveResult");
    }

    @ActivityCallback
    private void saveResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            call.resolve(new JSObject().put("saved", false)); return;
        }
        Uri uri = result.getData().getData();
        if (uri == null) { call.reject("No document was selected"); return; }
        try (OutputStream stream = getContext().getContentResolver().openOutputStream(uri, "wt")) {
            if (stream == null) throw new java.io.IOException("Cannot open this document");
            stream.write(Base64.decode(call.getString("base64", ""), Base64.DEFAULT));
        } catch (Exception e) { call.reject("Could not write the picture", e); return; }
        call.resolve(new JSObject().put("saved", true));
    }
}
