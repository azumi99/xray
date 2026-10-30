import { sendAwb } from '@/lib/api/services/agentScan';
import { gql, useMutation, useQuery } from '@apollo/client';
import { CameraType, CameraView, FlashMode, useCameraPermissions } from 'expo-camera';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';

import { Camera as CameraIcon, Check, Copy, FlipHorizontal, Maximize2, Plus, X, Zap, ZapOff } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../constants/theme';
import { useAuth } from '@/lib/store/auth';
import { useBatchModeStore } from '@/lib/store/batchModeStore';
import { useThemeStore } from '../lib/store/themeStore';

// Interface untuk WatchedFile dari GraphQL
interface WatchedFile {
    id: string;
    filepath: string;
    assign_id: string | null;
    created_at: string;
}

// Interface untuk X-ray image dengan status tracking
interface XrayImage {
  id: string;
  uri: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress?: number;
  error?: string;
  uploadedPath?: string;
}

// Interface untuk selectable watched file
interface SelectableWatchedFile extends WatchedFile {
  uri: string;
  selected: boolean;
}

// GraphQL mutation for creating airwaybill (basic version)
const CREATE_AIRWAYBILL_MUTATION = gql`
  mutation CreateAirwaybillXray($input: CreateAirwaybillXrayInput!) {
    createAirwaybillXray(input: $input) {
      id
      airwaybill_number
      photo_airwaybill
      created_at
      updated_at
      xray_photos_count
      already_exists
    }
  }
`;

// Batch mode: insert sebanyak Quantity manifest (job backend)
const CREATE_AIRWAYBILL_BATCH_MUTATION = gql`
  mutation CreateAirwaybillXrayBatch($input: CreateAirwaybillXrayInput!) {
    createAirwaybillXrayBatch(input: $input) {
      id
      airwaybill_number
      hawb
      photo_airwaybill
      created_at
      updated_at
      xray_photos_count
      already_exists
      batch_count
    }
  }
`;

// GraphQL mutation for creating single airwaybill detail
const CREATE_AIRWAYBILL_DETAIL_MUTATION = gql`
  mutation CreateAirwaybillXrayDetail($input: CreateAirwaybillXrayDetailInput!) {
    createAirwaybillXrayDetail(input: $input) {
      id
      id_airwaybill
      xray_photo
      created_at
    }
  }
`;

// GraphQL Query untuk WatchedFiles
const GET_WATCHED_FILES_QUERY = gql`
  query GetWatchedFiles {
    watchedFiles(first: 20) {
      data {
        id
        filepath
        link
        assign_id
        created_at
      }
    }
  }
`;

// GraphQL Mutation untuk CreateWatchedFile
const CREATE_WATCHED_FILE_MUTATION = gql`
  mutation CreateWatchedFile($input: CreateWatchedFileInput!) {
    createWatchedFile(input: $input) {
      id
      filepath
      assign_id
      created_at
    }
  }
`;


type OCRCameraModalProps = {
    visible: boolean;
    onClose: () => void;
    onCaptureComplete?: (awbNumber: string, xrayImages: string[]) => void;
};

const OCRCameraModal = ({ visible, onClose, onCaptureComplete }: OCRCameraModalProps) => {
    const [permission, requestPermission] = useCameraPermissions();
    const [flash, setFlash] = useState<FlashMode>('off');
    const [facing, setFacing] = useState<CameraType>('back');
    const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
    const [extractedText, setExtractedText] = useState<string>('');
    const [extractedHawb, setExtractedHawb] = useState<string>('');
    const [ocrDetail, setOcrDetail] = useState<any>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [messageLoading, setMessageLoading] = useState('');
    const [copied, setCopied] = useState(false);
    const [xrayImages, setXrayImages] = useState<XrayImage[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [showFileSelection, setShowFileSelection] = useState(false);
    const [selectableFiles, setSelectableFiles] = useState<SelectableWatchedFile[]>([]);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const cameraRef = useRef<CameraView>(null);
    const barcodeHandledRef = useRef(false);
    // Multi-barcode: 1 label bisa punya 2 barcode (MAWB atas + HAWB bawah)
    const barcodeSeenRef = useRef<Map<string, { count: number; x: number; y: number }>>(new Map());
    const barcodeSingleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    console.log('OCRCameraModal rendered with visible:', xrayImages);

    // Get session data for authorization
    const { session } = useAuth();
    const { theme } = useThemeStore();
    const isDark = theme === 'dark';

    // GraphQL mutation hooks
    const [createAirwaybill] = useMutation(CREATE_AIRWAYBILL_MUTATION);
    const [createAirwaybillBatch] = useMutation(CREATE_AIRWAYBILL_BATCH_MUTATION);
    const { batchMode } = useBatchModeStore();
    const [createAirwaybillDetail] = useMutation(CREATE_AIRWAYBILL_DETAIL_MUTATION);

    // Query watched files - fetch otomatis saat component visible
    const { data: watchedFilesData, refetch: refetchWatchedFiles, loading: watchedFilesLoading, error: watchedFilesError } = useQuery(GET_WATCHED_FILES_QUERY, {
        fetchPolicy: 'cache-and-network',
        variables: { first: 20 },
        skip: !visible,
    });

    // Mutation untuk create watched file
    const [createWatchedFile] = useMutation(CREATE_WATCHED_FILE_MUTATION);

    const watchedFiles = watchedFilesData?.watchedFiles?.data || [];

    // State untuk tracking file baru di selection modal
    const [previousFilesRef, setPreviousFilesRef] = useState<string[]>([]);
    const [newFilesInSelection, setNewFilesInSelection] = useState<string[]>([]);

    // Deteksi file baru saat watchedFiles berubah (untuk file selection)
    useEffect(() => {
        if (showFileSelection) {
            const currentIds = watchedFiles.map((f: WatchedFile) => f.id);
            const newFiles = currentIds.filter((id: string) => !previousFilesRef.includes(id));
            if (newFiles.length > 0) {
                setNewFilesInSelection(newFiles);
                // Update selectableFiles dengan file baru di depan (paling kiri)
                setSelectableFiles(prev => {
            const base = (process.env.EXPO_PUBLIC_GRAPHQL_URL || 'http://localhost:3000/graphql').replace('/graphql', '');
                    const existingIds = prev.map(f => f.id);
                    const newSelectableFiles = watchedFiles
                        .filter(f => !existingIds.includes(f.id) && !xrayImages.some(img => img.id === f.id))
                        // Urutkan dari yang terbaru
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .map(file => ({
                            ...file,
                            uri: file.link
                                ? (file.link.startsWith('http') ? file.link : `${base}${file.link}`)
                                : `${base}/storage/${file.filepath}`,
                            selected: false,
                        }));
                    // File baru di depan, file lama di belakang
                    return [...newSelectableFiles, ...prev];
                });
            }
            setPreviousFilesRef(currentIds);
        }
    }, [watchedFiles, showFileSelection, xrayImages]);

    // Reset tracking saat file selection dibuka/tutup
    useEffect(() => {
        if (showFileSelection) {
            setPreviousFilesRef(watchedFiles.map((f: WatchedFile) => f.id));
            setNewFilesInSelection([]);
        }
    }, [showFileSelection, watchedFiles]);

    console.log('Watched files query - visible:', visible);
    console.log('Watched files query - loading:', watchedFilesLoading);
    console.log('Watched files query - error:', watchedFilesError);
    console.log('Watched files query - data:', watchedFilesData);
    console.log('Watched files fetched:', watchedFiles);

    // Polling setiap 5 detik untuk cek watched files baru
    useEffect(() => {
        if (visible) {
            // Refetch immediately saat modal visible
            refetchWatchedFiles();

            // Setup polling interval setiap 5 detik
            pollingIntervalRef.current = setInterval(() => {
                refetchWatchedFiles();
            }, 5000);

            // Cleanup interval saat modal tidak visible atau unmount
            return () => {
                if (pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current);
                    pollingIntervalRef.current = null;
                }
            };
        } else {
            // Cleanup saat modal tidak visible
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
        }
    }, [visible, refetchWatchedFiles]);

    const toggleFlash = () => {
        setFlash((current) => (current === 'off' ? 'on' : 'off'));
    };

    const toggleCameraFacing = () => {
        setFacing((current) => (current === 'back' ? 'front' : 'back'));
    };

    const pickXrayImages = async () => {
        // Tampilkan horizontal list dengan watched files yang bisa dipilih
        console.log('Watched files data:', watchedFiles); // Log watched files data

        const base = (process.env.EXPO_PUBLIC_GRAPHQL_URL || 'http://localhost:3000/graphql').replace('/graphql', '');
        const files: SelectableWatchedFile[] = watchedFiles
            .filter(file => !xrayImages.some(img => img.id === file.id))
            .map(file => ({
                ...file,
                // Use the link field if available, otherwise construct from backend base URL and filepath
                uri: file.link
                    ? (file.link.startsWith('http') ? file.link : `${base}${file.link}`)
                    : `${base}/storage/${file.filepath}`,
                selected: false,
            }));
        setSelectableFiles(files);
        setShowFileSelection(true);
    };

    const toggleFileSelection = (id: string) => {
        setSelectableFiles(prev =>
            prev.map(file =>
                file.id === id ? { ...file, selected: !file.selected } : file
            )
        );
    };

    const openImagePreview = (uri: string) => {
        setPreviewImage(uri);
    };

    const closeImagePreview = () => {
        setPreviewImage(null);
    };

    const confirmFileSelection = () => {
        const selectedImages: XrayImage[] = selectableFiles
            .filter(file => file.selected)
            .map(file => ({
                id: file.id,
                uri: file.uri,
                status: 'success' as const,
                uploadedPath: file.filepath,
            }));
        setXrayImages(prev => [...prev, ...selectedImages]);
        setShowFileSelection(false);
        setSelectableFiles([]);
        setNewFilesInSelection([]);
    };

    const cancelFileSelection = () => {
        setShowFileSelection(false);
        setSelectableFiles([]);
    };

    const removeXrayImage = (id: string) => {
        setXrayImages(prev => prev.filter(img => img.id !== id));
    };

    // Function to upload AWB image to API
    const uploadImage = async (imageUri: string): Promise<string | null> => {
        try {
            // Check if session exists
            if (!session) {
                throw new Error('No authentication token available');
            }

            const base = (process.env.EXPO_PUBLIC_GRAPHQL_URL || 'http://localhost:3000/graphql').replace('/graphql', '');
            const result = await FileSystem.uploadAsync(`${base}/api/uploads`, imageUri, {
                fieldName: 'image',
                httpMethod: 'POST',
                uploadType: FileSystem.FileSystemUploadType.MULTIPART,
                mimeType: 'image/jpeg',
                headers: { Authorization: `Bearer ${session}` },
            });

            if (result.status < 200 || result.status >= 300) {
                throw new Error(`Upload failed: ${result.status} - ${result.body}`);
            }

            const parsed = JSON.parse(result.body);
            if (!parsed.image_path) {
                throw new Error('No image_path in response');
            }

            return parsed.image_path;
        } catch (error) {
            console.error('Image upload error:', error);
            return null;
        }
    };


    // Barcode terdeteksi: snap otomatis + langsung insert tanpa AI
    const takePictureForBarcode = async (barcodeValue: string, hawbValue?: string) => {
        if (!cameraRef.current || !permission?.granted) return;
        try {
            // Beri kamera waktu stabil agar frame tidak blur setelah deteksi cepat
            await new Promise((resolve) => setTimeout(resolve, 100));
            const photo = await cameraRef.current.takePictureAsync({
                quality: 1,
                base64: false,
                skipProcessing: false,
                shutterSound: false,
              });
            if (!photo?.uri) throw new Error('No photo returned from camera');
            setCapturedPhoto(photo.uri);
            setOcrDetail(null);
            setExtractedText(hawbValue ? `${barcodeValue} · ${hawbValue}` : barcodeValue);
            setIsSaving(true);
            await handleDone({ awb: barcodeValue, hawb: hawbValue, photoUri: photo.uri });
        } catch (error) {
            console.error('Barcode capture error:', error);
            Alert.alert('Barcode Error', error instanceof Error ? error.message : 'Failed to capture barcode');
            barcodeHandledRef.current = false;
            barcodeSeenRef.current = new Map();
        } finally {
            setIsSaving(false);
        }
    };

    const resetBarcodeScan = () => {
        barcodeSeenRef.current = new Map();
        if (barcodeSingleTimerRef.current) {
            clearTimeout(barcodeSingleTimerRef.current);
            barcodeSingleTimerRef.current = null;
        }
    };

    // Proses hasil akhir: barcode paling atas = MAWB, di bawahnya = HAWB (opsional)
    const finishBarcodeScan = () => {
        if (barcodeSingleTimerRef.current) {
            clearTimeout(barcodeSingleTimerRef.current);
            barcodeSingleTimerRef.current = null;
        }
        if (barcodeHandledRef.current) return;
        const stable = [...barcodeSeenRef.current.entries()]
            .filter(([, v]) => v.count >= 2)
            .sort((a, b) => a[1].y - b[1].y);
        if (stable.length === 0) {
            resetBarcodeScan();
            return;
        }
        barcodeHandledRef.current = true;
        // MAWB = barcode paling atas; HAWB = barcode kedua di bawahnya (jika ada)
        void takePictureForBarcode(stable[0][0], stable[1]?.[0]);
    };

    const handleBarcodeScanned = ({ data, bounds }: { data: string; bounds?: { origin?: { x: number; y: number } } }) => {
        if (barcodeHandledRef.current || isProcessing || isSaving) return;
        const value = (data ?? '').trim();
        if (!value || value.length < 4) return;

        const x = bounds?.origin?.x ?? 0;
        const y = bounds?.origin?.y ?? 0;
        const seen = barcodeSeenRef.current;
        const isNew = !seen.has(value);
        const entry = seen.get(value) ?? { count: 0, x, y };
        entry.count += 1;
        entry.x = x;
        entry.y = y;
        seen.set(value, entry);

        // Barcode baru muncul: tunda keputusan supaya barcode keduanya sempat terbaca
        if (isNew && barcodeSingleTimerRef.current) {
            clearTimeout(barcodeSingleTimerRef.current);
            barcodeSingleTimerRef.current = null;
        }
        if (entry.count < 2) return;

        const stableCount = [...seen.values()].filter((v) => v.count >= 2).length;
        if (stableCount >= 2) {
            // 2 barcode stabil terbaca bersamaan → langsung proses
            finishBarcodeScan();
        } else if (!barcodeSingleTimerRef.current) {
            // baru 1 stabil: beri jendela 250 ms supaya barcode kedua sempat terbaca
            barcodeSingleTimerRef.current = setTimeout(finishBarcodeScan, 250);
        }
    };

    const takePicture = async () => {
        if (!cameraRef.current) {
            Alert.alert('Camera Error', 'Camera is not ready. Please try again.');
            return;
        }
        try {
            console.log('Taking picture...');

            // Ensure camera is ready
            if (!permission?.granted) {
                throw new Error('Camera permission not granted');
            }

            // Take picture with better configuration
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.9,
                base64: false,
                skipProcessing: false,
                shutterSound: false,
            });

            console.log('Photo captured:', photo);

            if (photo?.uri) {
                setCapturedPhoto(photo.uri);
                await processOCR(photo.uri);
            } else {
                throw new Error('No photo returned from camera');
            }
        } catch (error) {
            console.error('Camera error:', error);

            let errorMessage = 'Failed to take picture';

            if (error instanceof Error) {
                if (error.message.includes('permission')) {
                    errorMessage = 'Camera permission is required. Please check your device settings.';
                } else if (error.message.includes('not available')) {
                    errorMessage = 'Camera is not available on this device.';
                } else if (error.message.includes('busy')) {
                    errorMessage = 'Camera is busy. Please wait a moment and try again.';
                } else if (error.message.includes('Permission denied')) {
                    errorMessage = 'Camera permission denied. Please enable camera access in settings.';
                } else if (error.message.includes('Camera not ready')) {
                    errorMessage = 'Camera is still starting up. Please wait and try again.';
                } else {
                    errorMessage = `Camera error: ${error.message}`;
                }
            }

            Alert.alert('Camera Error', errorMessage, [
                {
                    text: 'OK',
                    style: 'default',
                },
                {
                    text: 'Retry',
                    style: 'default',
                    onPress: () => setTimeout(takePicture, 1000),
                }
            ]);
        }
    };


    const processOCR = async (imageUri: string, attempt = 0) => {
    setIsProcessing(true);
    setMessageLoading(attempt === 0 ? 'Analyzing document with AI...' : `Retrying OCR (${attempt + 1})...`);
    setExtractedText('');
    setExtractedHawb('');
    setOcrDetail(null);

    try {
        const res = await sendAwb(imageUri);

        if (res?.success && res.data) {
            setOcrDetail(res.data);
            setExtractedText(res.data.tracking_number || '');
        } else {
            throw new Error('Failed to extract document data');
        }
    } catch (error) {
        console.error(error);
        Alert.alert(
            'OCR Failed',
            error instanceof Error ? error.message : 'Failed to extract text',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Retry', onPress: () => processOCR(imageUri, attempt + 1) },
            ]
        );
    } finally {
        setIsProcessing(false);
        setMessageLoading('');
    }
};


    const retakePicture = () => {
        setCapturedPhoto(null);
        setExtractedText('');
        setCopied(false);
        setOcrDetail(null);
        barcodeHandledRef.current = false;
        resetBarcodeScan();
    };


    const copyToClipboard = async () => {
        await Clipboard.setStringAsync(extractedText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleClose = () => {
        setCapturedPhoto(null);
        setExtractedText('');
        setXrayImages([]);
        setCopied(false);
        setOcrDetail(null);
        barcodeHandledRef.current = false;
        resetBarcodeScan();
        onClose();
    };

    const handleDone = async (overrides?: { awb?: string; hawb?: string; ocr?: Record<string, any>; photoUri?: string }) => {
        const awbNumber = (overrides?.awb ?? extractedText).trim();
        const hawbNumber = (overrides?.hawb ?? extractedHawb).trim();
        const photoUri = overrides?.photoUri ?? capturedPhoto;
        const ocr = overrides?.ocr ?? ocrDetail ?? {};
        const ocrFields = {
            kurir: ocr.kurir ?? null,
            tanggal: ocr.tanggal ?? null,
            pengirim: ocr.pengirim ?? null,
            penerima_nama: ocr.penerima_nama ?? null,
            penerima_alamat: ocr.penerima_alamat ?? null,
            penerima_kota: ocr.penerima_kota ?? null,
            penerima_kode_pos: ocr.penerima_kode_pos ?? null,
            penerima_telepon: ocr.penerima_telepon ?? null,
            berat: ocr.berat ?? null,
            jumlah_koli: ocr.jumlah_koli ?? null,
            isi_barang: ocr.isi_barang ?? null,
            nilai_deklarasi: ocr.nilai_deklarasi ?? null,
            tipe_pajak: ocr.tipe_pajak ?? null,
            cod: ocr.cod ?? false,
        };
        console.log('🔄 Handling Done with AWB:', session);
        console.log('📸 X-ray images ready:', xrayImages.length);

        // Validate authentication
        if (!session) {
            Alert.alert('Authentication Error', 'Please log in to save AWB data');
            return;
        }

        // Validate inputs
        if (!photoUri) {
            Alert.alert('Error', 'Please capture a photo first');
            return;
        }

        if (!awbNumber) {
            Alert.alert('Error', 'Please enter or confirm the AWB number');
            return;
        }

        setIsSaving(true);

        try {
            // Step 1: Upload the captured AWB photo
            console.log('📤 Uploading AWB photo...');
            const imagePath = await uploadImage(photoUri);
            if (!imagePath) {
                throw new Error('Failed to upload AWB photo');
            }

            console.log('✅ AWB photo uploaded successfully:', imagePath);

            // Step 2: Create airwaybill record — batch mode pakai job backend (insert sebanyak qty manifest)
            console.log(batchMode ? '📝 Creating AWB batch records...' : '📝 Creating AWB record...');
            const { data } = batchMode
                ? await createAirwaybillBatch({
                    variables: {
                        input: {
                            airwaybill_number: awbNumber,
                            photo_airwaybill: imagePath,
                            hawb: hawbNumber,
                            ...ocrFields,
                        },
                    },
                })
                : await createAirwaybill({
                    variables: {
                        input: {
                            airwaybill_number: awbNumber,
                            photo_airwaybill: imagePath,
                            hawb: hawbNumber,
                            ...ocrFields,
                        },
                    },
                });
            console.log('✅ Create airwaybill response:', data);

            const created = data?.createAirwaybillXray ?? data?.createAirwaybillXrayBatch;
            if (!created) {
                throw new Error('Failed to create AWB record - No data returned');
            }

            if (created.already_exists) {
                Alert.alert(
                    'Data Sudah Ada',
                    `AWB dengan nomor ${awbNumber} sudah pernah tersimpan. Data baru tetap ditambahkan sebagai record terpisah.`
                );
            }

            const awbId = created.id;
            console.log('✅ AWB created successfully with ID:', awbId, batchMode ? `(batch ${created.batch_count ?? '?'} records)` : '');

            // Step 3: Use x-ray photos yang sudah berhasil di-upload saat selection
            const xrayPhotoPaths = xrayImages
                .filter(img => img.status === 'success' && img.uploadedPath)
                .map(img => img.uploadedPath!);

            console.log('📸 Successfully uploaded X-ray photos:', xrayPhotoPaths.length);

            // Step 4: Create airwaybill details for x-ray photos one by one
            if (xrayPhotoPaths.length > 0) {
                console.log(`💾 Creating ${xrayPhotoPaths.length} airwaybill x-ray details...`);
                let successCount = 0;

                for (let i = 0; i < xrayPhotoPaths.length; i++) {
                    try {
                        console.log(`💾 Creating detail ${i + 1}/${xrayPhotoPaths.length}:`, xrayPhotoPaths[i]);

                        const { data: detailData, errors: detailErrors } = await createAirwaybillDetail({
                            variables: {
                                input: {
                                    id_airwaybill: awbId,
                                    xray_photo: xrayPhotoPaths[i],
                                },
                            },
                        });

                        if (detailErrors) {
                            console.error(`❌ Failed to create detail ${i + 1}:`, detailErrors);
                        } else {
                            console.log(`✅ Detail ${i + 1} created successfully:`, detailData);
                            successCount++;
                        }
                    } catch (error) {
                        console.error(`❌ Error creating detail ${i + 1}:`, error);
                    }
                }

                console.log(`💾 Successfully created ${successCount}/${xrayPhotoPaths.length} airwaybill details`);

                if (successCount === 0) {
                    throw new Error('Failed to save any x-ray photos to database');
                } else if (successCount < xrayPhotoPaths.length) {
                    console.warn(`⚠️ Only ${successCount} out of ${xrayPhotoPaths.length} x-ray photos were saved successfully`);
                }
            }

            // Success message
            let successMessage = '✅ AWB has been saved successfully!';
            if (xrayPhotoPaths.length > 0) {
                successMessage = `✅ AWB and ${xrayPhotoPaths.length} X-ray photos have been saved successfully!`;
            }

            Alert.alert(
                'Success',
                successMessage,
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            if (onCaptureComplete) {
                                const imageUris = xrayImages.map(img => img.uri);
                                onCaptureComplete(extractedText.trim(), imageUris);
                            }
                            handleClose();
                        },
                    },
                ]
            );

        } catch (error) {
            console.error('❌ Save error:', error);
            let errorMessage = 'Unable to save AWB. Please try again.';

            if (error instanceof Error) {
                if (error.message.includes('No authentication token')) {
                    errorMessage = 'Authentication required. Please log in again.';
                } else if (error.message.includes('Upload failed')) {
                    errorMessage = 'Failed to upload AWB image. Please check your connection and try again.';
                } else if (error.message.includes('Failed to create AWB record')) {
                    errorMessage = 'Failed to save AWB data. Please try again.';
                } else if (error.message.includes('ApolloError')) {
                    errorMessage = 'GraphQL error. Please try again in a moment.';
                } else if (error.message.includes('Failed to save x-ray photos')) {
                    errorMessage = 'Failed to save X-ray photos to database. Please try again.';
                }
            }

            Alert.alert(
                'Save Failed',
                errorMessage,
                [
                    {
                        text: 'Cancel',
                        style: 'cancel',
                    },
                    {
                        text: 'Retry',
                        onPress: () => handleDone(),
                    },
                ]
            );
        } finally {
            setIsSaving(false);
        }
    };

    if (!visible) return null;

    return (
        <View style={styles.fullScreenOverlay}>
            <View style={styles.modalContent}>
                {/* Permission not granted yet */}
                {!permission && (
                    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#111827' : COLORS.background }]} edges={['left', 'right', 'top', 'bottom']}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                    </SafeAreaView>
                )}

                {/* Request permission */}
                {permission && !permission.granted && (
                    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#111827' : COLORS.background }]} edges={['left', 'right', 'top', 'bottom']}>
                        <View style={styles.permissionContainer}>
                            <CameraIcon width={64} height={64} color={isDark ? '#9CA3AF' : COLORS.gray} />
                            <Text style={[styles.permissionTitle, isDark && { color: '#F9FAFB' }]}>Camera Permission Required</Text>
                            <Text style={[styles.permissionText, isDark && { color: '#9CA3AF' }]}>
                                We need access to your camera to scan and extract text
                            </Text>
                            <TouchableOpacity onPress={requestPermission} style={styles.permissionButton}>
                                <Text style={styles.permissionButtonText}>Allow Camera Access</Text>
                            </TouchableOpacity>
                        </View>
                    </SafeAreaView>
                )}

               {/* Camera View */}
                {permission && permission.granted && !capturedPhoto && (
                    <SafeAreaView style={styles.container}>
                        <CameraView
                            style={styles.camera}
                            facing={facing}
                            flash={flash}
                            ref={cameraRef}
                            autofocus="on"
                            onBarcodeScanned={handleBarcodeScanned}
                            barcodeScannerSettings={{ barcodeTypes: ['code128', 'code39', 'itf14', 'ean13', 'codabar'] }}
                        >
                            <View style={styles.safeAreaWrapper}>
                                <View style={styles.controlsContainer}>
                                    <View style={styles.topControls}>
                                        <TouchableOpacity onPress={handleClose} style={styles.iconButton}>
                                            <X stroke={COLORS.white} width={24} height={24} />
                                        </TouchableOpacity>
                                        <View style={styles.ocrBadge}>
                                            <Text style={styles.ocrBadgeText}>OCR Mode</Text>
                                        </View>
                                        <TouchableOpacity onPress={toggleFlash} style={styles.iconButton}>
                                            {flash === 'on' ? (
                                                <Zap stroke={COLORS.white} width={24} height={24} />
                                            ) : (
                                                <ZapOff stroke={COLORS.white} width={24} height={24} />
                                            )}
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.scanArea}>
                                        <View style={[styles.corner, styles.topLeft]} />
                                        <View style={[styles.corner, styles.topRight]} />
                                        <View style={[styles.corner, styles.bottomLeft]} />
                                        <View style={[styles.corner, styles.bottomRight]} />
                                        <Text style={styles.scanHint}>Position text within frame</Text>
                                    </View>

                                    <View style={styles.bottomControls}>
                                        <TouchableOpacity
                                            style={[styles.iconButton, styles.flipButton]}
                                            onPress={toggleCameraFacing}
                                        >
                                            <FlipHorizontal stroke={COLORS.white} width={24} height={24} />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={takePicture} style={styles.captureButton}>
                                            <View style={styles.captureInner} />
                                        </TouchableOpacity>
                                        <View style={[styles.iconButton, styles.placeholderButton]} />
                                    </View>
                                </View>
                            </View>
                        </CameraView>
                    </SafeAreaView>
                )}


                {/* Preview with OCR Results */}
                {/* Preview with OCR Results */}
                {capturedPhoto && (
                    <SafeAreaView style={[styles.resultContainer, isDark && { backgroundColor: '#111827' }]} edges={['left', 'right', 'top', 'bottom']}>
                        <View style={styles.resultHeader}>
                            <Text style={[styles.resultTitle, isDark && { color: '#F9FAFB' }]}>OCR Result</Text>
                            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                                <X stroke={isDark ? '#F9FAFB' : COLORS.text} width={24} height={24} />
                            </TouchableOpacity>
                        </View>

                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                            style={{ flex: 1 }}
                        >
                            <ScrollView
                                style={styles.resultContent}
                                contentContainerStyle={{ flexGrow: 1, paddingBottom: 160 }}
                                showsVerticalScrollIndicator={false}
                                keyboardShouldPersistTaps="handled"
                            >
                                {/* Scanned Image Card */}
                                <View style={[styles.resultImageCard, isDark && { backgroundColor: '#1F2937' }]}>
                                    <Image source={{ uri: capturedPhoto }} style={styles.resultImage} />
                                    <View style={styles.scannedBadge}>
                                        <Maximize2 stroke="#FFFFFF" width={12} height={12} />
                                        <Text style={styles.scannedBadgeText}>Scanned</Text>
                                    </View>
                                </View>

                                {/* AWB Number Input */}
                                <View style={styles.fieldGroup}>
                                    <Text style={[styles.fieldLabel, isDark && { color: '#9CA3AF' }]}>AWB Number</Text>
                                    <View style={[styles.inputCard, isDark && { backgroundColor: '#1F2937', borderColor: '#374151' }]}>
                                        <TextInput
                                            style={[styles.inputField, isDark && { color: '#F9FAFB' }]}
                                            value={extractedText}
                                            onChangeText={setExtractedText}
                                            placeholder="000 0000 0000"
                                            placeholderTextColor="#9CA3AF"
                                            editable={!isProcessing}
                                        />
                                        <TouchableOpacity onPress={copyToClipboard} style={styles.copyAction}>
                                            {copied ? (
                                                <Check stroke={COLORS.success} width={20} height={20} />
                                            ) : (
                                                <Copy stroke={isDark ? '#60A5FA' : "#3B82F6"} width={20} height={20} />
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* OCR Detail Card */}
                                {ocrDetail && (
                                    <View style={[styles.fieldGroup, { backgroundColor: isDark ? '#1F2937' : '#ffffff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: isDark ? '#374151' : '#E5E7EB', marginBottom: 24 }]}>
                                        <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#60A5FA' : '#3B82F6', marginBottom: 10 }}>
                                            {ocrDetail.kurir || 'Document Details'}
                                        </Text>

                                        {([
                                            ['Tanggal', ocrDetail.tanggal],
                                            ['Pengirim', ocrDetail.pengirim],
                                            ['Penerima', ocrDetail.penerima_nama],
                                            ['Alamat', ocrDetail.penerima_alamat],
                                            ['Kota', ocrDetail.penerima_kota],
                                            ['Kode Pos', ocrDetail.penerima_kode_pos],
                                            ['Telepon', ocrDetail.penerima_telepon],
                                            ['Berat', ocrDetail.berat],
                                            ['Koli', ocrDetail.jumlah_koli],
                                            ['Isi Barang', ocrDetail.isi_barang],
                                            ['Nilai Deklarasi', ocrDetail.nilai_deklarasi],
                                            ['Tipe Pajak', ocrDetail.tipe_pajak],
                                            ['COD', typeof ocrDetail.cod === 'boolean' ? (ocrDetail.cod ? 'Yes' : 'No') : null],
                                        ] as Array<[string, string | null | undefined]>).map(([label, value]) =>
                                            value ? (
                                                <View key={label} style={{ flexDirection: 'row', paddingVertical: 3, gap: 12 }}>
                                                    <Text style={{ width: 105, fontSize: 12, color: '#9CA3AF' }}>{label}</Text>
                                                    <Text style={{ flex: 1, fontSize: 12, fontWeight: '500', color: isDark ? '#F9FAFB' : COLORS.text }}>{value}</Text>
                                                </View>
                                            ) : null
                                        )}
                                    </View>
                                )}

                                {/* X-ray Image Upload */}
                                <View style={styles.fieldGroup}>
                                    <Text style={[styles.fieldLabel, isDark && { color: '#9CA3AF' }]}>X-ray Image</Text>
                                    <TouchableOpacity 
                                        onPress={pickXrayImages} 
                                        style={[
                                            styles.addXrayButton,
                                            isDark && { 
                                                backgroundColor: 'rgba(59, 130, 246, 0.1)', 
                                                borderColor: 'rgba(59, 130, 246, 0.3)' 
                                            }
                                        ]}
                                    >
                                        <View style={styles.addXrayContent}>
                                             <Plus stroke={isDark ? '#60A5FA' : "#3B82F6"} width={20} height={20} />
                                             <Text style={[styles.addXrayText, isDark && { color: '#60A5FA' }]}>Add X-ray Images</Text>
                                        </View>
                                    </TouchableOpacity>

                                    {/* Image Previews (Horizontal) */}
                                    {xrayImages.length > 0 && (
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.xrayList}>
                                            {xrayImages.map((img) => (
                                                <View key={img.id} style={styles.xrayThumbnail}>
                                                    <Image source={{ uri: img.uri }} style={styles.xrayThumbImage} />
                                                    <TouchableOpacity onPress={() => removeXrayImage(img.id)} style={styles.removeXrayBtn}>
                                                        <X stroke="white" width={10} height={10} />
                                                    </TouchableOpacity>
                                                    {img.status === 'success' && (
                                                        <View style={styles.statusBadgeSuccess}><Check stroke="white" width={10} height={10}/></View>
                                                    )}
                                                    {img.status === 'uploading' && (
                                                        <View style={styles.uploadProgressOverlay}>
                                                            <ActivityIndicator size="small" color="white" />
                                                        </View>
                                                    )}
                                                </View>
                                            ))}
                                        </ScrollView>
                                    )}
                                </View>
                            </ScrollView>

                            {/* Footer Actions */}
                            <View style={[styles.resultFooter, isDark && { backgroundColor: '#111827', borderColor: '#374151' }]}>
                                <TouchableOpacity style={[styles.btnSecondary, isDark && { backgroundColor: '#374151' }]} onPress={retakePicture}>
                                    <Text style={[styles.btnSecondaryText, isDark && { color: '#F9FAFB' }]}>Retake</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.btnPrimary, (isSaving || isProcessing) && styles.btnDisabled]}
                                    onPress={() => handleDone()}
                                    disabled={isSaving || isProcessing}
                                >
                                    {isSaving ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <Text style={styles.btnPrimaryText}>Done</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </KeyboardAvoidingView>

                        {/* Loading Overlay */}
                        {isProcessing && (
                            <View style={[styles.loadingOverlay, isDark && { backgroundColor: 'rgba(0, 0, 0, 0.8)' }]}>
                                <View style={[styles.loadingCard, isDark && { backgroundColor: '#1F2937' }]}>
                                    <ActivityIndicator size="large" color={isDark ? '#60A5FA' : "#3B82F6"} />
                                    <Text style={[styles.loadingText, isDark && { color: '#F9FAFB' }]}>{messageLoading || 'Processing...'}</Text>
                                </View>
                            </View>
                        )}
                    </SafeAreaView>
                )}

                {/* File Selection Modal - With Preview */}
                {showFileSelection && (
                    <View style={styles.fileSelectionOverlay}>
                        <SafeAreaView style={[styles.fileSelectionModal, !isDark && { backgroundColor: '#FFFFFF' }]} edges={['left', 'right', 'top', 'bottom']}>
                            <View style={[styles.fileSelectionHeader, !isDark && { backgroundColor: '#F9FAFB', borderBottomColor: '#E5E7EB' }]}>
                                <View>
                                    <Text style={[styles.fileSelectionTitle, !isDark && { color: '#111827' }]}>Select X-ray Images</Text>
                                    <View style={styles.fileSelectionSubtitle}>
                                        <Text style={[styles.fileSelectionCountText, !isDark && { color: '#6B7280' }]}>
                                            {selectableFiles.length} images available
                                        </Text>
                                        {watchedFilesLoading && (
                                            <ActivityIndicator size="small" color="#3B82F6" style={{ marginLeft: 8 }} />
                                        )}
                                    </View>
                                </View>
                                <View style={styles.fileSelectionHeaderRight}>
                                    {newFilesInSelection.length > 0 && (
                                        <View style={styles.newFilesBadge}>
                                            <Text style={styles.newFilesBadgeText}>+{newFilesInSelection.length} NEW</Text>
                                        </View>
                                    )}
                                    <TouchableOpacity onPress={cancelFileSelection} style={styles.fileSelectionCloseBtn}>
                                        <X stroke={isDark ? "#FFFFFF" : "#111827"} width={24} height={24} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {selectableFiles.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <Text style={styles.emptyStateText}>No new X-ray images available</Text>
                                </View>
                            ) : (
                                <>
                                    {/* Preview Section */}
                                    <View style={[styles.fileSelectionPreviewSection, !isDark && { backgroundColor: '#F3F4F6' }]}>
                                        {previewImage ? (
                                            <View style={styles.previewContainer}>
                                                <Image source={{ uri: previewImage }} style={styles.previewImageLarge} resizeMode="contain" />
                                                <TouchableOpacity
                                                    style={styles.previewCloseBtn}
                                                    onPress={() => setPreviewImage(null)}
                                                >
                                                    <X stroke="white" width={20} height={20} />
                                                </TouchableOpacity>
                                            </View>
                                        ) : (
                                            <View style={styles.previewPlaceholder}>
                                                <Text style={[styles.previewPlaceholderText, !isDark && { color: '#9CA3AF' }]}>Tap an image to preview</Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Thumbnails Section */}
                                    <View style={[styles.fileSelectionThumbnailsSection, !isDark && { backgroundColor: '#FFFFFF' }]}>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                            {selectableFiles.map((file, index) => {
                                                const isNew = newFilesInSelection.includes(file.id);
                                                return (
                                                    <TouchableOpacity
                                                        key={file.id}
                                                        style={[
                                                            styles.fileSelectionThumbnail,
                                                            previewImage === file.uri && styles.fileSelectionThumbnailActive,
                                                            !isDark && { borderColor: previewImage === file.uri ? '#2563EB' : 'transparent' }
                                                        ]}
                                                        onPress={() => openImagePreview(file.uri)}
                                                        activeOpacity={0.9}
                                                    >
                                                        <Image source={{ uri: file.uri }} style={[styles.fileSelectionThumbImage, !isDark && { backgroundColor: '#E5E7EB' }]} />
                                                        {isNew && (
                                                            <View style={styles.fileSelectionNewBadge}>
                                                                <Text style={styles.fileSelectionNewBadgeText}>NEW</Text>
                                                            </View>
                                                        )}
                                                        <TouchableOpacity
                                                            style={styles.fileSelectionCheckboxBtn}
                                                            onPress={() => toggleFileSelection(file.id)}
                                                        >
                                                            <View style={[
                                                                styles.fileSelectionCheckbox,
                                                                !isDark && { borderColor: 'white', backgroundColor: 'rgba(0,0,0,0.3)' },
                                                                file.selected && styles.fileSelectionCheckboxChecked
                                                            ]}>
                                                                {file.selected && (
                                                                    <Check stroke="white" width={12} height={12} />
                                                                )}
                                                            </View>
                                                        </TouchableOpacity>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </ScrollView>
                                    </View>

                                    <View style={[styles.fileSelectionFooter, !isDark && { backgroundColor: '#FFFFFF', borderTopColor: '#E5E7EB' }]}>
                                        <Text style={[styles.fileSelectionCount, !isDark && { color: '#4B5563' }]}>
                                            {selectableFiles.filter(f => f.selected).length} selected
                                        </Text>
                                        <TouchableOpacity
                                            style={[
                                                styles.fileSelectionConfirmBtn,
                                                selectableFiles.filter(f => f.selected).length === 0 && styles.fileSelectionConfirmBtnDisabled
                                            ]}
                                            onPress={confirmFileSelection}
                                            disabled={selectableFiles.filter(f => f.selected).length === 0}
                                        >
                                            <Text style={styles.fileSelectionConfirmText}>Add Selected</Text>
                                        </TouchableOpacity>
                                    </View>
                                </>
                            )}
                        </SafeAreaView>
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    fullScreenOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'black',
        zIndex: 9999,
    },
    modalContent: {
        flex: 1,
        backgroundColor: 'black',
    },
    container: {
        flex: 1,
        backgroundColor: COLORS.black,
    },
    camera: {
        flex: 1,
    },
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
        backgroundColor: COLORS.background,
    },
    permissionTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: SPACING.l,
        marginBottom: SPACING.m,
        textAlign: 'center',
        color: COLORS.text,
    },
    permissionText: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: SPACING.xl,
        lineHeight: 24,
        color: COLORS.textSecondary,
    },
    permissionButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.m,
        borderRadius: SPACING.m,
    },
    permissionButtonText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '600',
    },
    safeAreaWrapper: {
        flex: 1,
    },
    controlsContainer: {
        flex: 1,
        justifyContent: 'space-between',
    },
    topControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.m,
        paddingVertical: SPACING.m,
    },
    iconButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    ocrBadge: {
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    ocrBadgeText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 12,
    },
    scanArea: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    corner: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderColor: 'white',
        borderWidth: 4,
    },
    topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
    topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
    bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
    bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
    scanHint: {
        color: 'white',
        marginTop: 20,
        fontSize: 14,
        opacity: 0.8,
    },
    bottomControls: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingBottom: 40,
    },
    flipButton: {
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    captureButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 4,
        borderColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    captureInner: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'white',
    },
    placeholderButton: {
        width: 50,
        height: 50,
    },

    // Result / Preview Styles
    resultContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    resultHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 10,
    },
    resultTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#111827',
    },
    closeButton: {
        padding: 4,
    },
    resultContent: {
        flex: 1,
        paddingHorizontal: 20,
    },
    resultImageCard: {
        marginTop: 20,
        marginBottom: 24,
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: '#F3F4F6',
        // aspectRatio: 10/3,
        height:'40%',
        position: 'relative',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 3,
    },
    resultImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    scannedBadge: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        backgroundColor: 'rgba(31, 41, 55, 0.85)',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    scannedBadgeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    fieldGroup: {
        marginBottom: 20,
    },
    fieldLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6B7280',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    inputCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        paddingHorizontal: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    inputField: {
        flex: 1,
        fontSize: 16,
        color: '#111827',
        paddingVertical: 14,
        fontWeight: '500',
    },
    copyAction: {
        padding: 8,
    },
    addXrayButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F0F9FF',
        borderWidth: 2,
        borderColor: '#93C5FD',
        borderStyle: 'dashed',
        borderRadius: 16,
        height: 56,
    },
    addXrayContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    addXrayText: {
        color: '#2563EB',
        fontSize: 15,
        fontWeight: '600',
    },
    xrayList: {
        marginTop: 12,
        paddingVertical: 5,

    },
    xrayThumbnail: {
        width: 64,
        height: 64,
        marginRight: 10,
        position: 'relative',
    },
    xrayThumbImage: {
        width: 64,
        height: 64,
        borderRadius: 12,
        backgroundColor: '#E5E7EB',
        resizeMode: 'cover',
    },
    removeXrayBtn: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: '#EF4444',
        borderRadius: 12,
        width: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: 'white',
        zIndex: 10,
    },
    statusBadgeSuccess: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        backgroundColor: '#22C55E',
        borderRadius: 10,
        width: 18,
        height: 18,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: 'white',

    },
    uploadProgressOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Footer
    resultFooter: {
        padding: 24,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderColor: '#F3F4F6',
    },
    btnSecondary: {
        flex: 1,
        backgroundColor: '#F3F4F6',
        paddingVertical: 14,
        borderRadius: 99,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnSecondaryText: {
        color: '#374151',
        fontSize: 15,
        fontWeight: '600',
    },
    btnPrimary: {
        flex: 1,
        backgroundColor: '#2563EB',
        paddingVertical: 14,
        borderRadius: 99,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnDisabled: {
        opacity: 0.7,
        backgroundColor: '#93C5FD',
    },
    btnPrimaryText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '600',
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    // Loading Overlay Styles
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        zIndex: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingCard: {
        backgroundColor: 'white',
        padding: 24,
        borderRadius: 20,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        minWidth: 180,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 15,
        fontWeight: '600',
        color: '#374151',
        textAlign: 'center',
    },
    processingContainer: {
        marginTop: 4,
    },
    processingText: {
        fontSize: 12,
        color: '#6B7280',
        fontStyle: 'italic',
    },
    // File Selection Modal Styles - With Preview
    fileSelectionOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        zIndex: 100,
        justifyContent: 'center',
        width: '100%',
        height: '100%',
    },
    fileSelectionModal: {
        flex: 1,
        backgroundColor: '#1F2937',
        margin: 20,
        borderRadius: 20,
        overflow: 'hidden',
    },
    fileSelectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#374151',
        backgroundColor: '#111827',
    },
    fileSelectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: 'white',
    },
    fileSelectionSubtitle: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    fileSelectionCountText: {
        fontSize: 13,
        color: '#9CA3AF',
    },
    fileSelectionHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    newFilesBadge: {
        backgroundColor: '#22C55E',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    newFilesBadgeText: {
        color: 'white',
        fontSize: 11,
        fontWeight: '700',
    },
    fileSelectionCloseBtn: {
        padding: 4,
    },
    fileSelectionPreviewSection: {
        flex: 1,
        backgroundColor: '#111827',
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewContainer: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    previewImageLarge: {
        width: '100%',
        height: '100%',
        flex: 1,
        resizeMode: 'contain',
    },
    previewCloseBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 20,
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    previewPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewPlaceholderText: {
        fontSize: 16,
        color: '#6B7280',
    },
    fileSelectionThumbnailsSection: {
        height: 120,
        backgroundColor: '#1F2937',
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    emptyState: {
        paddingVertical: 60,
        alignItems: 'center',
    },
    emptyStateText: {
        fontSize: 14,
        color: '#9CA3AF',
    },
    fileSelectionThumbnail: {
        width: 90,
        height: 90,
        marginRight: 10,
        position: 'relative',
        borderRadius: 10,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    fileSelectionThumbnailActive: {
        borderColor: '#2563EB',
    },
    fileSelectionNewBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: '#22C55E',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    fileSelectionNewBadgeText: {
        color: 'white',
        fontSize: 9,
        fontWeight: '700',
    },
    fileSelectionThumbImage: {
        width: 90,
        height: 90,
        borderRadius: 10,
        backgroundColor: '#374151',
        resizeMode: 'cover',
    },
    fileSelectionCheckboxBtn: {
        position: 'absolute',
        top: 4,
        left: 4,
    },
    fileSelectionCheckbox: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: 'white',
        backgroundColor: 'rgba(0,0,0,0.4)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    fileSelectionCheckboxChecked: {
        backgroundColor: '#2563EB',
        borderColor: '#2563EB',
    },
    fileSelectionFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#374151',
        backgroundColor: '#1F2937',
    },
    fileSelectionCount: {
        fontSize: 14,
        color: '#D1D5DB',
    },
    fileSelectionConfirmBtn: {
        backgroundColor: '#2563EB',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 99,
    },
    fileSelectionConfirmBtnDisabled: {
        backgroundColor: '#4B5563',
    },
    fileSelectionConfirmText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default OCRCameraModal;
