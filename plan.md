# Mobile App Plan – AWB Mobile (React Native Expo + Gluestack UI + Expo Router)

Mobile application built with **React Native Expo**, **Gluestack UI**, dan **Expo Router** dengan **modern, minimal, dan clean interface**.

Bottom navigation contains 3 main actions:

- **List**
- **Add** (large center floating button, acts as camera trigger)
- **Profile**

> **Phase Fokus Saat Ini:**  
> Hanya **UI & UX** dengan data dummy. Backend GraphQL & Zustand akan ditambahkan di fase berikutnya.

---

## 1. Teknologi & Arsitektur

### Frontend

- **React Native** dengan **Expo**
- **Expo Router** (file-based routing):
  - Root Stack: auth group, tabs group, camera, detail
  - Tabs di dalam group `(tabs)` dengan custom tab bar
- **Gluestack UI** untuk komponen UI (Button, Input, Layout, Card, dll) dengan styling modern:
  - Rounded corners (`$2xl`)
  - Soft shadows
  - Subtle gradients
- **Expo Camera** (untuk flow Add)
- **AsyncStorage / SecureStore** melalui wrapper `storage.ts` (sementara untuk fake session)

### Fase Berikutnya (Rencana)

- **GraphQL** (Apollo / urql) – query & mutation
- **Zustand** – state management global:
  - Auth (session/user)
  - AWB list & detail
  - UI/global flags (loading, error, dsb)

---

## 2. Navigation Structure (Expo Router)

Menggunakan **Expo Router** dengan struktur folder berikut:

### 2.1. Root Routes

- `app/_layout.tsx`
  - Menggunakan `<Stack>` dari `expo-router`.
  - Screen:
    - `(auth)` group → untuk route login.
    - `(tabs)` group → untuk bottom tabs utama.
    - `add-camera` → screen kamera.
    - `detail/[id]` → detail AWB.

**Flow dasar:**

- Jika belum login → redirect ke `(auth)/login`.
- Jika sudah login → masuk ke `(tabs)`.

> Untuk Phase UI, pengecekan login bisa simple (pseudo), nanti dipindahkan ke Zustand.

### 2.2. Auth Group

- Folder: `app/(auth)/`
  - `login.tsx` → `LoginScreen`.

### 2.3. Tabs Group

- Folder: `app/(tabs)/`
  - `_layout.tsx` → definisi `<Tabs>`:
    - Tab: `list` → `ListScreen`.
    - Tab: `profile` → `ProfileScreen`.
    - Custom `tabBar` menggunakan komponen `BottomNav` dengan desain modern:
      - Floating, rounded, shadow.
      - Tombol Add besar di tengah (floating action button) → `router.push("/add-camera")`.
  - `list.tsx` → `ListScreen`.
  - `profile.tsx` → `ProfileScreen`.

### 2.4. Other Screens

- `app/add-camera.tsx` → `AddCameraScreen`.
- `app/detail/[id].tsx` → `DetailScreen`.

---

## 3. Screens & Modern UI Detail

### 3.1. LoginScreen – `app/(auth)/login.tsx`

**Tujuan:** Modern login screen dengan clean layout.

**Modern UI:**

- Background:
  - `Box` full screen dengan **gradient halus** (mis. dari `$primary500` ke `$primary900` di bagian atas, lalu fade ke `$background0` di bawah).
- Layout:
  - `SafeAreaView` + `ScrollView` untuk perangkat kecil.
  - Container utama:
    - `VStack` terpusat dengan maxWidth (mis. 360–400) dan align center.
- Header section:
  - Small pill / chip di atas: “Welcome back”.
  - Brand/title:
    - Text besar, bold: “AWB Mobile”.
    - Subtitle: text kecil abu-abu: “Track & capture airwaybills easily”.
- Form card:
  - `Box` / `Card` dengan:
    - `bg="$background0"` atau `$background50`.
    - `borderRadius="$2xl"`.
    - `px="$5"`, `py="$6"`.
    - `shadow` halus untuk efek **elevated card**.
- Input Email:
  - `FormControl` modern:
    - Label kecil: “Email”.
    - `Input` dengan:
      - Left icon (mail).
      - Border soft (`$borderLight300`), focus border `$primary500`.
      - Rounded penuh (`$full`).
    - Helper/error text kecil di bawah.
- Input Password:
  - Mirip email:
    - Left icon (lock).
    - Right icon (eye/eye-off) untuk toggle visibility.
- Login button:
  - `Button` full width, rounded full:
    - Background `$primary600`, dengan state hover/pressed sedikit lebih gelap.
    - Text semibold, `fontSize="$md"`.
- Extra:
  - Text kecil: “Forgot password?” di kanan bawah form (non-fungsional untuk sekarang).
  - Footer kecil di bawah: “v1.0 · UI Only Mode”.

**Behavior (Phase UI):**

- Saat `Login` ditekan dan form valid:
  - Tampilkan `Button` dalam state loading (spinner).
  - Simulasi delay 800–1000ms.
  - Simpan flag session dummy → `storage.ts`.
  - `router.replace("/(tabs)/list")`.
- Error state:
  - Jika email atau password kosong:
    - Highlight `FormControl` dengan `isInvalid`.
    - Tampilkan error text singkat: “Email is required.” / “Password is required.”.

---

### 3.2. ListScreen – `app/(tabs)/list.tsx`

**Tujuan:** Modern list view untuk AWB.

**Modern UI:**

- Background:
  - `Box` dengan `bg="$background50"` atau `$background100`.
- Header:
  - Sticky header di atas:
    - `VStack` dengan padding horizontal:
      - Title: “AWB List” (bold, medium-large).
      - Subtitle: “View and manage captured airwaybills”.
  - Di bawah title:
    - Search bar secara visual seperti **pill search**:
      - `Input` rounded full.
      - Left icon search.
      - Background sedikit berbeda (`$background0`), tanpa border heavy.
- Filter/info row (opsional):

  - `HStack` kecil dengan info jumlah item: “12 items” dan filter icon kecil (non functional untuk sekarang).

- List Content:
  - `FlatList` menggunakan card dengan desain modern:
    - `Card` atau `Box`:
      - `borderRadius="$2xl"`.
      - `bg="$background0"`.
      - `shadow` ringan atau `borderWidth={1}` dengan `borderColor="$borderLight200"`.
      - `p="$4"`, `mb="$3"`.
    - Isi item:
      - Top row:
        - AWB Number bold, `fontSize="$md"`.
        - Small pill on the right (optional): e.g. “NEW” / “DRAFT”.
      - Bottom row:
        - Small calendar icon + formatted created date (muted color).
        - Optional tertiary info di kanan (e.g. “#12345”).
- Empty state:
  - Centered `EmptyState`:
    - Icon outline (e.g. archive/search).
    - Title: “No AWB yet”.
    - Subtitle: “Capture your first airwaybill using the Add button.”

**Behavior:**

- Pull to refresh:
  - Top-down gesture:
    - Show refresh indicator modern (default RN, tapi background-nya mendukung).
  - Simulasi delay.
- Search:
  - Live filter di memory.
- Tap item:
  - `router.push("/detail/" + id)`.

---

### 3.3. AddCameraScreen – `app/add-camera.tsx`

**Tujuan:** Modern camera capture flow.

**Modern UI:**

- Fullscreen:
  - `Box` dengan background hitam, kamera fill screen.
- Top overlay:
  - `HStack`:
    - Back button (rounded icon button, translucent black w/ white icon).
    - Center text kecil: “Capture AWB”.
    - Optional flash toggle di kanan (icon).
- Middle overlay:
  - Optional subtle overlay:
    - Semi-transparent frame/rectangle untuk guiding area AWB (border lines).
    - Text kecil di bawah frame: “Align the AWB inside the frame”.
- Bottom:
  - Gradient overlay dari transparan ke hitam semi.
  - `VStack`:
    - Row kecil: mini preview last photo (dummy).
    - Capture button:
      - Big circular button di tengah, putih dengan inner circle.
    - Optional switch camera (left) & gallery icon (right).

**Behavior (Phase UI):**

- Press capture:
  - Ambil `uri` (atau dummy).
  - `router.push({ pathname: "/detail/new", params: { initialPhoto: uri } })`.

---

### 3.4. DetailScreen – `app/detail/[id].tsx`

**Tujuan:** Modern form untuk detail AWB + gallery.

**Modern UI:**

- Background:
  - `ScrollView` dengan `bg="$background50"`.
- Hero section:
  - `VStack` atas:
    - Title: jika `id` ada → “Edit AWB”, jika tidak → “New AWB”.
    - Subtitle kecil: “Fill the information below”.
- Content card:
  - `Box` / `Card`:
    - `bg="$background0"`.
    - `borderRadius="$2xl"`.
    - `p="$5"`.
    - `shadow` ringan.
- Fields:
  - AWB Number:
    - `FormControl` + label kecil.
    - `Input` rounded full, border halus.
  - Photo Gallery:
    - Label: “Photos”.
    - Horizontal scroll:
      - `PhotoItem`:
        - Rounded card dengan image fill.
        - Shadow halus.
        - Delete icon kecil floating di pojok kanan atas (circle, semi-transparent).
      - Dummy “Add” card:
        - Dashed border, center icon + text “Add”.
  - Add Photo button:
    - `Button` variant `outline` atau `link` dengan icon kamera/gallery:
      - “Add more photos”.
  - Save button:
    - `Button` full width, rounded full, sticky di bawah atau di akhir form:
      - Warna `$primary600`.
      - Bisa ditanam di `BottomSheet` style sticky footer (optional).

**Behavior (Phase UI):**

- Jika `initialPhoto` ada:
  - Auto tambah ke `photos`.
- Save:
  - Validasi minimal → jika gagal, highlight `FormControl` + toast error.
  - Jika ok → toast success “Saved successfully (dummy)” + `router.back()` atau kembali ke list.

---

### 3.5. ProfileScreen – `app/(tabs)/profile.tsx`

**Tujuan:** Modern profile + settings.

**Modern UI:**

- Background:
  - `ScrollView` dengan `bg="$background50"`.
- Header:
  - `HStack`:
    - Avatar circle (initial user).
    - `VStack`:
      - Name (dummy).
      - Email (muted).
    - Optional small pill “Online”.
- Section card:
  - `Box` / `Card`:
    - `bg="$background0"`, `borderRadius="$2xl"`, `p="$5"`, `shadow` ringan.
  - Inside:
    - Section title: “Security”.
    - Fields change password:
      - `FormControl + Input` Old Password (rounded full).
      - `FormControl + Input` New Password.
      - `Button` small: “Update Password”.
- Logout card:
  - `Box` dengan `bg="$red50"` atau tetap putih.
  - `Button` variant `outline` / `solid` dengan warna `danger`:
    - Rounded full, icon logout.

**Behavior (Phase UI):**

- Change password:
  - Validasi & toast “Password updated (dummy)” (modern toast Gluestack).
- Logout:
  - Clear session.
  - `router.replace("/(auth)/login")`.

---

## 4. Components (Modern Style)

### 4.1. BottomNav – Modern Floating Tab Bar

**Desain:**

- Container:
  - `Box` dengan:
    - `position="absolute"` + padding bottom (untuk safe area).
    - `borderRadius="$3xl"`.
    - `bg="$background0"`.
    - `shadow` kuat tapi soft (blur).
    - Slight margin dari tepi (floating effect).
- Tabs:
  - `HStack` equal space.
  - Icons + label kecil di bawah (text size `$xs`).
- Add button:
  - Floating di tengah agak naik (overlap):
    - Circle besar:
      - `bg="$primary600"`.
      - `size="$12"` or similar.
      - Shadow kuat.
      - Icon kamera putih.

**Behavior:**

- Tekan List / Profile:
  - navigate sesuai `route.name`.
- Tekan Add:
  - `router.push("/add-camera")`.

---

### 4.2. PhotoItem

- `Box`:
  - `borderRadius="$2xl"`.
  - `overflow="hidden"`.
  - Shadow kecil.
- `Image` fill.
- Delete icon:
  - `Pressable` kecil di pojok atas:
    - `bg="rgba(0,0,0,0.4)"`, icon trash putih.

---

### 4.3. AwbListItem

- `Pressable`:
  - `bg="$background0"`.
  - `borderRadius="$2xl"`.
  - `p="$4"`, `mb="$3"`.
  - `shadow` ringan / border soft.
- Content:
  - `HStack`:
    - Left:
      - AWB Number bold.
      - Created date kecil, muted.
    - Right:
      - Optional small badge (status).

---

### 4.4. EmptyState

- Centered `VStack`:
  - Circular icon background dengan soft color.
  - Title medium.
  - Description dim text.
  - Optional `Button` kecil “Try again” / “Add AWB”.

---

## 5. Folder Structure (Expo Router + Modern UI)

```bash
app/
  _layout.tsx              # Root Stack layout (auth, tabs, add-camera, detail)

  (auth)/
    login.tsx              # Modern LoginScreen

  (tabs)/
    _layout.tsx            # Tabs layout with custom modern BottomNav
    list.tsx               # Modern ListScreen
    profile.tsx            # Modern ProfileScreen

  add-camera.tsx           # Modern AddCameraScreen
  detail/
    [id].tsx               # Modern DetailScreen

components/
  BottomNav.tsx            # Custom floating tabBar
  PhotoItem.tsx
  AwbListItem.tsx
  EmptyState.tsx

store/
  index.ts
  authStore.ts
  awbStore.ts

graphql/
  client.ts
  queries/
    awb.ts
  mutations/
    awb.ts

services/
  auth.ts
  awb.ts
  storage.ts

mocks/
  awbList.ts
  awbDetail.ts

utils/
  formatDate.ts
  validators.ts

assets/
  images/
  icons/
```

---

## 6. Implementation Status

**Current Status: ✅ Complete**

All screens and components mentioned in this plan have been implemented:

- ✅ **Navigation structure** - Expo Router with proper stack and tab navigation
- ✅ **LoginScreen** - Modern UI with form validation and session handling
- ✅ **ListScreen** - AWB list with search, filtering, and refresh functionality
- ✅ **AddCameraScreen** - Camera interface with capture functionality
- ✅ **DetailScreen** - AWB detail form with photo gallery
- ✅ **ProfileScreen** - User profile with security settings and logout
- ✅ **BottomNav** - Custom floating tab bar with center action button
- ✅ **All components** - PhotoItem, AwbListItem, EmptyState as specified
- ✅ **Mock data** - AWB lists and detail data for UI phase
- ✅ **Services** - Storage wrapper for session management
- ✅ **Utilities** - Date formatting and validation functions
