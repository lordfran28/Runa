// The Runa app: the website in a window of its own, plus what only an app can do on the phone:
// a passage on the home screen, a passage each day as a notification, keeping text shared from other
// apps, and scanning the code that brings the keys over from the PC.
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val run = (System.getenv("RUN_NUMBER") ?: "1").toInt()

android {
    namespace = "io.github.lordfran28.runa"
    compileSdk = 34
    defaultConfig {
        applicationId = "io.github.lordfran28.runa"
        minSdk = 28
        targetSdk = 34
        versionCode = run
        versionName = "1.$run"
    }
    signingConfigs {
        create("release") {
            val ks = System.getenv("KEYSTORE")
            if (ks != null) {
                storeFile = file(ks)
                storePassword = System.getenv("KEYSTORE_PASSWORD")
                keyAlias = "runa"
                keyPassword = System.getenv("KEYSTORE_PASSWORD")
            }
        }
    }
    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("release")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    lint { checkReleaseBuilds = false; abortOnError = false }
}

dependencies {
    implementation("com.google.android.gms:play-services-code-scanner:16.1.0")
}
