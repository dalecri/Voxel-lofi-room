package com.lofirooms.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

// Android's document picker grants access only to the file the owner chooses.
// No broad storage permissions, cache-only downloads, or outbound sharing required.
@CapacitorPlugin(name = "LetterFiles")
public class LetterFilesPlugin extends Plugin {
    @PluginMethod
    public void save(PluginCall call) {
        String html = call.getString("html");
        String filename = call.getString("filename");
        if (html == null || filename == null) {
            call.reject("A letter and filename are required");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("text/html");
        intent.putExtra(Intent.EXTRA_TITLE, filename);
        startActivityForResult(call, intent, "saveResult");
    }

    @ActivityCallback
    private void saveResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            call.resolve(new JSObject().put("saved", false));
            return;
        }
        Uri uri = result.getData().getData();
        if (uri == null) {
            call.reject("No document was selected");
            return;
        }
        try (OutputStream stream = getContext().getContentResolver().openOutputStream(uri, "wt")) {
            if (stream == null) throw new java.io.IOException("Cannot open this document");
            stream.write(call.getString("html", "").getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            call.reject("Could not write the letter", e);
            return;
        }
        call.resolve(new JSObject().put("saved", true));
    }
}
