package com.reactnativeandroidwidget;

import static android.content.res.Configuration.ORIENTATION_PORTRAIT;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProviderInfo;
import android.content.ComponentName;
import android.content.Context;
import android.os.Bundle;
import android.util.DisplayMetrics;
import android.util.SizeF;
import android.util.TypedValue;

import java.util.ArrayList;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

import java.util.List;

public class RNWidgetUtil {
    @SuppressWarnings({"unchecked", "deprecation"})
    public static int getWidgetWidth(Context context, int widgetId) {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
            try {
                Bundle options = AppWidgetManager.getInstance(context).getAppWidgetOptions(widgetId);
                ArrayList<SizeF> sizes = options.getParcelableArrayList(AppWidgetManager.OPTION_APPWIDGET_SIZES);
                if (sizes != null && !sizes.isEmpty()) {
                    boolean isPortrait = context.getResources().getConfiguration().orientation == ORIENTATION_PORTRAIT;
                    int idx = (!isPortrait && sizes.size() > 1) ? 1 : 0;
                    return (int) sizes.get(idx).getWidth();
                }
                // Some launchers report per-cell width rather than actual placed width.
                // Multiply by targetCellWidth to get the correct bitmap canvas size.
                AppWidgetProviderInfo info = AppWidgetManager.getInstance(context).getAppWidgetInfo(widgetId);
                int maxW = getWidgetSizeInDp(context, widgetId, AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH);
                if (info != null && info.targetCellWidth > 1) {
                    return maxW * info.targetCellWidth;
                }
                return maxW;
            } catch (Exception e) {
                // fall through to legacy path
            }
        }
        return getWidgetSizeInDp(context, widgetId, AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH);
    }

    public static int getWidgetHeight(Context context, int widgetId) {
        boolean isPortrait = context.getResources().getConfiguration().orientation == ORIENTATION_PORTRAIT;
        if (isPortrait) {
            return getWidgetSizeInDp(context, widgetId, AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT);
        } else {
            return getWidgetSizeInDp(context, widgetId, AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT);
        }
    }

    public static int dpToPx(Context context, double dpValue) {
        return Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, (float) dpValue, context.getResources().getDisplayMetrics()));
    }

    public static double pxToDp(Context context, double pxValue) {
        DisplayMetrics displayMetrics = context.getResources().getDisplayMetrics();
        return pxValue / displayMetrics.density;
    }

    private static int getWidgetSizeInDp(Context context, int widgetId, String key) {
        return AppWidgetManager.getInstance(context).getAppWidgetOptions(widgetId).getInt(key, 0);
    }

    public static WritableArray getWidgetInfo(ReactApplicationContext context, String widgetName) {
        int[] widgetIds = getWidgetIds(context, widgetName);

        WritableArray writableArray = Arguments.createArray();

        for (int id : widgetIds) {
            WritableMap widgetMap = Arguments.createMap();
            widgetMap.putString("widgetName", widgetName);
            widgetMap.putInt("widgetId", id);
            widgetMap.putInt("height", getWidgetHeight(context, id));
            widgetMap.putInt("width", getWidgetWidth(context, id));
            widgetMap.putMap("screenInfo", getScreenInfo(context));

            writableArray.pushMap(widgetMap);
        }

        return writableArray;
    }

    public static WritableMap getScreenInfo(Context context) {
        WritableMap screenInfo = Arguments.createMap();
        screenInfo.putInt("screenHeightDp", context.getResources().getConfiguration().screenHeightDp);
        screenInfo.putInt("screenWidthDp", context.getResources().getConfiguration().screenWidthDp);
        screenInfo.putDouble("density", context.getResources().getDisplayMetrics().density);
        screenInfo.putInt("densityDpi", context.getResources().getDisplayMetrics().densityDpi);
        return screenInfo;
    }

    public static int[] getWidgetIds(Context context, String widgetName) {
        String widgetProviderClassName = getWidgetProviderClassName(context, widgetName);

        if (widgetProviderClassName == null) {
            return new int[]{};
        }

        ComponentName name = new ComponentName(context, widgetProviderClassName);
        return AppWidgetManager.getInstance(context).getAppWidgetIds(name);
    }

    public static String getWidgetProviderClassName(Context context, String widgetName) {
        List<AppWidgetProviderInfo> installedProviders = AppWidgetManager.getInstance(context).getInstalledProviders();

        for (AppWidgetProviderInfo providerInfo : installedProviders) {
            if (providerInfo.provider.getPackageName().equals(context.getPackageName())
                && providerInfo.provider.getShortClassName().endsWith("." + widgetName)) {

                return providerInfo.provider.getClassName();
            }
        }

        return null;
    }
}
