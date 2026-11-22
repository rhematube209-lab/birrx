package com.birrx.app;
import org.junit.Test;
import static org.junit.Assert.*;
public class UpdatePromptPolicyTest {
 @Test public void waitsUntilUnlockedAndReady(){assertFalse(UpdatePromptPolicy.canPrompt(false,true,false,false,6,0,0,100));assertFalse(UpdatePromptPolicy.canPrompt(true,true,true,false,6,0,0,100));assertFalse(UpdatePromptPolicy.canPrompt(true,false,false,false,6,0,0,100));assertFalse(UpdatePromptPolicy.canPrompt(true,true,false,true,6,0,0,100));}
 @Test public void offersAnAvailableVersionOnceThenHonorsDeferral(){long now=1000000000L;assertTrue(UpdatePromptPolicy.canPrompt(true,true,false,false,6,0,0,now));assertFalse(UpdatePromptPolicy.canPrompt(true,true,false,false,6,6,now-60000,now));assertTrue(UpdatePromptPolicy.canPrompt(true,true,false,false,6,6,now-UpdatePromptPolicy.DAY,now));}
 @Test public void newVersionIsNotSuppressedByPreviousDismissal(){assertTrue(UpdatePromptPolicy.canPrompt(true,true,false,false,7,6,10000,20000));}
 @Test public void rejectsMissingVersionAndClockRollback(){assertFalse(UpdatePromptPolicy.canPrompt(true,true,false,false,0,0,0,100));assertFalse(UpdatePromptPolicy.canPrompt(true,true,false,false,6,6,20000,10000));}
}
