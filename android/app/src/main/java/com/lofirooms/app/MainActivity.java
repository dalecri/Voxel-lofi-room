package com.lofirooms.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LetterFilesPlugin.class);
        registerPlugin(RoomQrFilesPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
