import * as typesModule from "utils/types";
import * as utilsModule from "utils/utils";
import * as applicationModule from "application";
import * as imageSourceModule from "image-source";
import * as cameraCommonModule from "./camera-common";
import * as platform from "platform";

var REQUEST_IMAGE_CAPTURE = 3453;

/**
 * [Deprecated. Please use same functionality from `nativescript-camera` npm module]
 */
export var takePicture = function (options?): Promise<any> {
    return new Promise((resolve, reject) => {
        try {
            let types: typeof typesModule = require("utils/types");
            let utils: typeof utilsModule = require("utils/utils");
            
            let saveToGallery;
            let reqWidth;
            let reqHeight;
            let shouldKeepAspectRatio;

            let density = utils.layout.getDisplayDensity();
            if (options) {
                saveToGallery = options.saveToGallery ? true : false;
                reqWidth = options.width ? options.width * density : 0;
                reqHeight = options.height ? options.height * density : reqWidth;
                shouldKeepAspectRatio = types.isNullOrUndefined(options.keepAspectRatio) ? true : options.keepAspectRatio;
            }
            let takePictureIntent = new android.content.Intent(android.provider.MediaStore.ACTION_IMAGE_CAPTURE);
            let dateStamp = createDateTimeStamp();
            
            let picturePath: string;
            let nativeFile;
            let tempPictureUri;

            if (saveToGallery) {
                picturePath = android.os.Environment.getExternalStoragePublicDirectory(
                    android.os.Environment.DIRECTORY_PICTURES).getAbsolutePath() + "/" + "cameraPicture_" + dateStamp + ".jpg";
                nativeFile = new java.io.File(picturePath);
                tempPictureUri = android.net.Uri.fromFile(nativeFile);
                takePictureIntent.putExtra(android.provider.MediaStore.EXTRA_OUTPUT, tempPictureUri);
            } else {
                picturePath = utils.ad.getApplicationContext().getExternalFilesDir(null).getAbsolutePath() + "/" + "cameraPicture_" + dateStamp + ".jpg";
                nativeFile = new java.io.File(picturePath);
                tempPictureUri = android.net.Uri.fromFile(nativeFile);
                takePictureIntent.putExtra(android.provider.MediaStore.EXTRA_OUTPUT, tempPictureUri);
            }

            if (takePictureIntent.resolveActivity(utils.ad.getApplicationContext().getPackageManager()) != null) {

                let appModule: typeof applicationModule = require("application");

                let previousResult = appModule.android.onActivityResult;
                appModule.android.onActivityResult = (requestCode: number, resultCode: number, data: android.content.Intent) => {
                    appModule.android.onActivityResult = previousResult;

                    if (requestCode === REQUEST_IMAGE_CAPTURE && resultCode === android.app.Activity.RESULT_OK) {
                        let imageSource: typeof imageSourceModule = require("image-source");
                        let options = new android.graphics.BitmapFactory.Options();
                        options.inJustDecodeBounds = true;
                        let bitmap = android.graphics.BitmapFactory.decodeFile(picturePath, options);

                        let sampleSize = calculateInSampleSize(options.outWidth, options.outHeight, reqWidth, reqHeight);

                        let finalBitmapOptions = new android.graphics.BitmapFactory.Options();
                        finalBitmapOptions.inSampleSize = sampleSize;
                        bitmap = android.graphics.BitmapFactory.decodeFile(picturePath, finalBitmapOptions);
                        let scaledSizeImage = null;
                        if (reqHeight > 0 && reqWidth > 0) {
                            if (shouldKeepAspectRatio) {

                                let common: typeof cameraCommonModule = require("./camera-common");

                                let aspectSafeSize = common.getAspectSafeDimensions(bitmap.getWidth(), bitmap.getHeight(), reqWidth, reqHeight);
                                scaledSizeImage = android.graphics.Bitmap.createScaledBitmap(bitmap, aspectSafeSize.width, aspectSafeSize.height, true);
                            }
                            else {
                                scaledSizeImage = android.graphics.Bitmap.createScaledBitmap(bitmap, reqWidth, reqHeight, true);
                            }
                        }
                        else {
                            scaledSizeImage = bitmap;
                        }

                        resolve(imageSource.fromNativeSource(scaledSizeImage));
                    }
                };

                appModule.android.foregroundActivity.startActivityForResult(takePictureIntent, REQUEST_IMAGE_CAPTURE);

            }
        } catch (e) {
            if (reject) {
                reject(e);
            }
        }
    });
}

/**
 * [Deprecated. Please use same functionality from `nativescript-camera` npm module]
 */
export var isAvailable = function () {
    var utils: typeof utilsModule = require("utils/utils");
    
    return utils.ad.getApplicationContext().getPackageManager().hasSystemFeature(android.content.pm.PackageManager.FEATURE_CAMERA)
}

var calculateInSampleSize = function (imageWidth, imageHeight, reqWidth, reqHeight) {
    let sampleSize = 1;
    let displayWidth = platform.screen.mainScreen.widthDIPs;
    let displayHeigth = platform.screen.mainScreen.heightDIPs;
    reqWidth = (reqWidth > 0 && reqWidth < displayWidth) ? reqWidth : displayWidth;
    reqHeight = (reqHeight > 0 && reqHeight < displayHeigth) ? reqHeight : displayHeigth;
    if (imageWidth > reqWidth && imageHeight > reqHeight) {
        let halfWidth = imageWidth / 2;
        let halfHeight = imageHeight / 2;
        while ((halfWidth / sampleSize) > reqWidth && (halfHeight / sampleSize) > reqHeight) {
            sampleSize *= 2;
        }
    }
    return sampleSize;
}

var createDateTimeStamp = function () {
    let result = "";
    let date = new Date();
    result = (date.getDate() < 10 ? "0" + date.getDate().toString() : date.getDate().toString()) +
        ((date.getMonth() + 1) < 10 ? "0" + (date.getMonth() + 1).toString() : (date.getMonth() + 1).toString()) +
        date.getFullYear().toString() +
        date.getHours().toString() +
        date.getMinutes().toString() +
        date.getSeconds().toString();
    return result;
}
