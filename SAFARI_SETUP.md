# Safari Extension Setup Guide

Safari Web Extensions require conversion to a native macOS/iOS app using Xcode. This guide walks you through the process.

## Prerequisites

1. **macOS** - Safari extensions can only be developed on macOS
2. **Xcode** - Download from the Mac App Store (free)
3. **Apple Developer Account** - Required for distribution (free for development)

## Step 1: Build the Extension

First, build the Safari version of the extension:

```bash
npm run build:safari
```

This creates the extension in `dist/safari/`.

## Step 2: Convert to Safari Web Extension

Apple provides a command-line tool to convert Chrome-style extensions to Safari Web Extensions:

```bash
# Navigate to the Safari build output
cd dist/safari

# Run the Safari Web Extension Converter
xcrun safari-web-extension-converter . --project-location ../safari-xcode --app-name "AI Chat Export"
```

### Converter Options

- `--project-location` - Where to create the Xcode project
- `--app-name` - Name of your app
- `--bundle-identifier` - Your app's bundle ID (e.g., `com.yourname.aichatexport`)
- `--swift` - Use Swift instead of Objective-C
- `--no-open` - Don't automatically open in Xcode
- `--macos-only` - Only create macOS target
- `--ios-only` - Only create iOS target

Example with more options:

```bash
xcrun safari-web-extension-converter . \
  --project-location ../safari-xcode \
  --app-name "AI Chat Export" \
  --bundle-identifier com.example.aichatexport \
  --swift \
  --no-open
```

## Step 3: Open in Xcode

Open the generated Xcode project:

```bash
open ../safari-xcode/AI\ Chat\ Export/AI\ Chat\ Export.xcodeproj
```

## Step 4: Configure the Project

In Xcode:

1. **Select your team** - In the project settings, select your Apple Developer team
2. **Update bundle identifier** - Set a unique bundle identifier
3. **Set deployment target** - Minimum Safari 15.4 for MV3 support

### Signing & Capabilities

1. Select the main app target
2. Go to "Signing & Capabilities"
3. Check "Automatically manage signing"
4. Select your development team

## Step 5: Build and Run

1. Select the macOS target in Xcode
2. Click the Run button (▶) or press Cmd+R
3. The app will launch and Safari will prompt to enable the extension

## Step 6: Enable in Safari

1. Open Safari
2. Go to Safari → Settings (Cmd+,)
3. Click the "Extensions" tab
4. Check the box next to "AI Chat Export"
5. Grant necessary permissions when prompted

## Development Workflow

### Making Changes

1. Make changes to your source code
2. Rebuild: `npm run build:safari`
3. In Xcode, rebuild the app (Cmd+B)
4. The extension will automatically reload in Safari

### Debugging

1. In Safari, enable the Develop menu:
   - Safari → Settings → Advanced → "Show Develop menu"
2. Open the extension popup or content script
3. Use Develop → Web Extension Background Content to debug background scripts
4. Use the Web Inspector on any page for content script debugging

## Distribution

### Mac App Store

1. Create an App Store Connect record
2. Archive the app in Xcode (Product → Archive)
3. Upload to App Store Connect
4. Submit for review

### Direct Distribution (Developer ID)

1. In Xcode, create an archive
2. Export with Developer ID signing
3. Notarize the app using `xcrun notarytool`
4. Distribute the `.app` file

### iOS Distribution

The converter can also create iOS targets. iOS Safari extensions work similarly but are distributed through the iOS App Store.

## Troubleshooting

### Extension Not Appearing

- Ensure "Allow Unsigned Extensions" is enabled in Safari's Develop menu during development
- Check the console for errors in Xcode

### API Compatibility Issues

Safari supports most Chrome extension APIs, but some differences exist:
- `browser.*` namespace is preferred over `chrome.*` (both work)
- Some APIs may have slightly different behavior
- Test thoroughly on Safari

### Permissions

Safari may handle permissions differently. If features aren't working:
1. Check Safari's extension settings
2. Ensure all required permissions are granted
3. Check for any Safari-specific permission dialogs

## Resources

- [Apple Safari Web Extensions Documentation](https://developer.apple.com/documentation/safariservices/safari_web_extensions)
- [Converting a Chrome Extension to Safari](https://developer.apple.com/documentation/safariservices/safari_web_extensions/converting_a_web_extension_for_safari)
- [Safari Web Extension Converter](https://developer.apple.com/documentation/safariservices/safari_web_extensions/running_your_safari_web_extension)

