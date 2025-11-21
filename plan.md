# Smart Meeting Client - Implementation Plan

## Goal Description
Build a "Smart Meeting Client" using Next.js that intelligently manages the user's microphone based on face presence.
- **Core Logic**: Use TensorFlow.js (Blazeface) to detect faces.
- **Rule**: Auto-mute if no face is detected for 3 seconds. Auto-unmute immediately when a face is detected.
- **UI**: Real-time video feed, status badge, and manual override.

## User Review Required
> [!IMPORTANT]
> - **Browser Permissions**: The app will require Camera and Microphone permissions.
> - **Performance**: Running TensorFlow.js in the browser can be resource-intensive. We will use the lightweight `blazeface` model to minimize impact.
> - **Privacy**: All processing happens locally in the browser. No video data is sent to a server.

## Proposed Changes

### Project Structure
We will use a standard Next.js App Router structure.

#### [NEW] `package.json`
- Dependencies: `next`, `react`, `react-dom`, `@tensorflow/tfjs`, `@tensorflow-models/blazeface`, `react-webcam`, `clsx`, `tailwind-merge`.
- DevDependencies: `tailwindcss`, `postcss`, `autoprefixer`.

#### [NEW] `src/hooks/useFaceDetection.ts`
- **Purpose**: Encapsulate the ML logic and state management.
- **Inputs**: `videoRef` (HTMLVideoElement).
- **Outputs**: `isFaceDetected`, `isMuted` (derived from logic), `modelLoaded`.
- **Logic**:
    - Load `blazeface` model on mount.
    - Run detection loop using `requestAnimationFrame`.
    - Maintain a `lastFaceDetectedTime` timestamp.
    - `useEffect` to check `Date.now() - lastFaceDetectedTime > 3000` to trigger mute.

#### [NEW] `src/components/SmartMeetingClient.tsx`
- **Purpose**: Main UI component.
- **Features**:
    - Renders `react-webcam`.
    - Displays Status Badge:
        - 🟢 Live (Face detected / Active)
        - 🔴 Muted - No Face (Auto-muted)
        - 🟠 Muted - Manual (If manual override is implemented)
    - Manual Override Button: Toggles mute state regardless of face detection.

#### [NEW] `src/app/page.tsx`
- **Purpose**: Entry point.
- **Content**: Wraps `SmartMeetingClient` in a nice layout.

## Verification Plan

### Automated Tests
- We will rely mainly on manual verification for the webcam/ML integration.

### Manual Verification
1.  **Permission Request**: Verify browser asks for Cam/Mic.
2.  **Detection**:
    - Show face -> Badge turns Green (Live).
    - Hide face -> Wait 3 seconds -> Badge turns Red (Muted).
    - Show face again -> Badge immediately turns Green.
3.  **Override**:
    - Click Override button -> Verify auto-mute logic is bypassed.
