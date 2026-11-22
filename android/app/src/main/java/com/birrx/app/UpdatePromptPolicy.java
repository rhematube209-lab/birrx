package com.birrx.app;

final class UpdatePromptPolicy {
    static final long DAY=24L*60*60*1000;
    static boolean canPrompt(boolean ready,boolean foreground,boolean locked,boolean flowActive,int version,int lastVersion,long lastAt,long now){
        if(!ready||!foreground||locked||flowActive||version<=0)return false;
        return version!=lastVersion||lastAt<=0||now-lastAt>=DAY;
    }
}
