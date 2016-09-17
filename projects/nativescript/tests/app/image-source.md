---
nav-title: "image-source How-To"
title: "image-source"
environment: nativescript
description: "Examples for using image-source"
previous_url: /ApiReference/image-source/HOW-TO
---
# Image source
Using the image source requires the image-source module.
{%snippet imagesource-require%}
The pre-required `imageSource` module is used throughout the following code snippets.
We also use fs module defined as follows:
{%snippet imagesource-require-alt%}

## Loading and saving images
### Load image using resource name
This is similar to loading Bitmap from `R.drawable.logo` on Android or calling `[UIImage imageNamed@"logo"]` on iOS
{%snippet imagesource-resname%}

### Load image from URL
{%snippet imagesource-load-url%}

### Save image source to PNG or JPG file
{%snippet imagesource-save-to%}

### Load image from a local file
{%snippet imagesource-load-local%}
