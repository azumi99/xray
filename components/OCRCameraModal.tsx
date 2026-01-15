import { sendAwb } from '@/lib/api/services/agentScan';
import { gql, useMutation, useQuery } from '@apollo/client';
import { CameraType, CameraView, FlashMode, useCameraPermissions } from 'expo-camera';
import * as Clipboard from 'expo-clipboard';
import { extractTextFromImage } from 'expo-text-extractor';
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
import { useAuth } from '../lib/store/auth';
import { HStack } from '@gluestack-ui/themed';

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
    const [isProcessing, setIsProcessing] = useState(false);
    const [messageLoading, setMessageLoading] = useState('');
    const [copied, setCopied] = useState(false);
    const [xrayImages, setXrayImages] = useState<XrayImage[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [showFileSelection, setShowFileSelection] = useState(false);
    const [selectableFiles, setSelectableFiles] = useState<SelectableWatchedFile[]>([]);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const cameraRef = useRef<CameraView>(null);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    console.log('OCRCameraModal rendered with visible:', xrayImages);

    // Get session data for authorization
    const { session } = useAuth();

    // GraphQL mutation hooks
    const [createAirwaybill] = useMutation(CREATE_AIRWAYBILL_MUTATION);
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

        const files: SelectableWatchedFile[] = watchedFiles
            .filter(file => !xrayImages.some(img => img.id === file.id))
            .map(file => ({
                ...file,
                // Use the link field if available, otherwise construct from API base URL and filepath
                uri: file.link || `${process.env.EXPO_PUBLIC_API_BASE_URL}/storage/${file.filepath}`,
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

            // Create FormData for file upload
            const formData = new FormData();
            formData.append('image', {
                uri: imageUri,
                type: 'image/jpeg',
                name: `awb_${Date.now()}.jpg`,
            } as any);

            // Upload image to the API with authorization
            const response = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/xray/upload`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${session}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Upload failed: ${response.status} - ${errorText}`);
            }

            const result = await response.json();

            // Check if the response contains image_path
            if (!result.image_path) {
                console.error('Upload response:', result);
                throw new Error('No image_path in response');
            }

            return result.image_path;
        } catch (error) {
            console.error('Image upload error:', error);
            return null;
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


    const processOCR = async (imageUri: string) => {
    setIsProcessing(true);
    setMessageLoading('Extracting text from image...');
    setExtractedText('');

    try {
        const result = await extractTextFromImage(imageUri);

        const cleaned = result.map(t =>
            t
                .toUpperCase()
                .replace(/O/g, '0')
                .replace(/I/g, '1')
                .replace(/[^A-Z0-9\-]/g, '')
        );

        const joined = cleaned.join(' ');
        console.log('Extracted AWB before formatting:', cleaned);

        let awb =
            joined.match(/\b\d{3}-\d{8}\b/)?.[0] ??
            (() => {
                const m = joined.match(/\b\d{3}\d{8}\b/);
                return m ? `${m[0].slice(0, 3)}-${m[0].slice(3)}` : null;
            })() ??
            joined.match(/\b\d{8}\b/)?.[0] ??
            null;
        let hawb =

            // Fallback: Cari pola EHAN / KGL yang diikuti angka
            joined.match(/\b(EHAN|KGL|FHAN)[A-Z0-9]+\b/)?.[0] ??

            null;

        if (awb && hawb) {
            setExtractedText(awb ?? '');
            setExtractedHawb(hawb ?? '');
            setIsProcessing(false);
            setMessageLoading('');
        } else {
            setExtractedText('');
            setExtractedHawb('');

            setIsProcessing(true);
            setMessageLoading("Extracting via AI service...");

            sendAwb(imageUri)
              .then(res => {
                if (res?.success) {
                  setExtractedText(res.data?.awb_no || '');
                  setExtractedHawb(res.data?.hawb_no || '');
                } else {
                  console.warn("Extract failed", res);
                }
              })
              .catch(err => {
                console.error(err.response?.data || err.message);
              })
              .finally(() => {
                setIsProcessing(false);
                setMessageLoading('');
              });

        }

        console.log('📦 AWB:', awb);
    } catch (error) {
        console.error(error);
        setIsProcessing(false);
        Alert.alert('OCR Error', 'Failed to extract text');
    }
};


    const retakePicture = () => {
        setCapturedPhoto(null);
        setExtractedText('');
        setCopied(false);
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
        onClose();
    };

    const handleDone = async () => {
        console.log('🔄 Handling Done with AWB:', session);
        console.log('📸 X-ray images ready:', xrayImages.length);

        // Validate authentication
        if (!session) {
            Alert.alert('Authentication Error', 'Please log in to save AWB data');
            return;
        }

        // Validate inputs
        if (!capturedPhoto) {
            Alert.alert('Error', 'Please capture a photo first');
            return;
        }

        if (!extractedText.trim()) {
            Alert.alert('Error', 'Please enter or confirm the AWB number');
            return;
        }

        setIsSaving(true);

        try {
            // Step 1: Upload the captured AWB photo
            console.log('📤 Uploading AWB photo...');
            const imagePath = await uploadImage(capturedPhoto);
            if (!imagePath) {
                throw new Error('Failed to upload AWB photo');
            }

            console.log('✅ AWB photo uploaded successfully:', imagePath);

            // Step 2: Create airwaybill record (basic version)
            console.log('📝 Creating AWB record...');
            const { data } = await createAirwaybill({
                variables: {
                    input: {
                        airwaybill_number: extractedText.trim(),
                        photo_airwaybill: imagePath,
                        hawb: extractedHawb.trim(),
                    },
                },
            });
            console.log('✅ Create airwaybill response:', data);

            if (!data?.createAirwaybillXray) {
                throw new Error('Failed to create AWB record - No data returned');
            }

            const awbId = data.createAirwaybillXray.id;
            console.log('✅ AWB created successfully with ID:', awbId);

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
                        onPress: handleDone,
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
                    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]} edges={['left', 'right', 'top', 'bottom']}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                    </SafeAreaView>
                )}

                {/* Request permission */}
                {permission && !permission.granted && (
                    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]} edges={['left', 'right', 'top', 'bottom']}>
                        <View style={styles.permissionContainer}>
                            <CameraIcon width={64} height={64} color={COLORS.gray} />
                            <Text style={styles.permissionTitle}>Camera Permission Required</Text>
                            <Text style={styles.permissionText}>
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
                        <CameraView style={styles.camera} facing={facing} flash={flash} ref={cameraRef}>
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
                    <SafeAreaView style={styles.resultContainer} edges={['left', 'right', 'top', 'bottom']}>
                        <View style={styles.resultHeader}>
                            <Text style={styles.resultTitle}>OCR Result</Text>
                            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                                <X stroke={COLORS.text} width={24} height={24} />
                            </TouchableOpacity>
                        </View>

                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                            style={{ flex: 1 }}
                        >
                            <ScrollView
                                style={styles.resultContent}
                                contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
                                showsVerticalScrollIndicator={false}
                                keyboardShouldPersistTaps="handled"
                            >
                                {/* Scanned Image Card */}
                                <View style={styles.resultImageCard}>
                                    <Image source={{ uri: capturedPhoto }} style={styles.resultImage} />
                                    <View style={styles.scannedBadge}>
                                        <Maximize2 stroke="#FFFFFF" width={12} height={12} />
                                        <Text style={styles.scannedBadgeText}>Scanned</Text>
                                    </View>
                                </View>

                                {/* AWB Number Input */}
                                <View style={styles.fieldGroup}>
                                    <Text style={styles.fieldLabel}>AWB Number</Text>
                                    <View style={styles.inputCard}>
                                        <TextInput
                                            style={styles.inputField}
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
                                                <Copy stroke="#3B82F6" width={20} height={20} />
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* HAWB Number Input */}
                                <View style={styles.fieldGroup}>
                                    <Text style={styles.fieldLabel}>HAWB Number</Text>
                                    <View style={styles.inputCard}>
                                        <TextInput
                                            style={styles.inputField}
                                            value={extractedHawb}
                                            onChangeText={setExtractedHawb}
                                            placeholder="Enter HAWB"
                                            placeholderTextColor="#9CA3AF"
                                            editable={!isProcessing}
                                        />
                                        {extractedHawb ? (
                                            <TouchableOpacity onPress={() => { Clipboard.setStringAsync(extractedHawb); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={styles.copyAction}>
                                                 <Copy stroke="#3B82F6" width={20} height={20} />
                                            </TouchableOpacity>
                                        ) : null}
                                    </View>
                                </View>

                                {/* X-ray Image Upload */}
                                <View style={styles.fieldGroup}>
                                    <Text style={styles.fieldLabel}>X-ray Image</Text>
                                    <TouchableOpacity onPress={pickXrayImages} style={styles.addXrayButton}>
                                        <View style={styles.addXrayContent}>
                                             <Plus stroke="#3B82F6" width={20} height={20} />
                                             <Text style={styles.addXrayText}>Add X-ray Images</Text>
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
                            <View style={styles.resultFooter}>
                                <TouchableOpacity style={styles.btnSecondary} onPress={retakePicture}>
                                    <Text style={styles.btnSecondaryText}>Retake</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.btnPrimary, (isSaving || isProcessing) && styles.btnDisabled]}
                                    onPress={handleDone}
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
                            <View style={styles.loadingOverlay}>
                                <View style={styles.loadingCard}>
                                    <ActivityIndicator size="large" color="#3B82F6" />
                                    <Text style={styles.loadingText}>{messageLoading || 'Processing...'}</Text>
                                </View>
                            </View>
                        )}
                    </SafeAreaView>
                )}

                {/* File Selection Modal - With Preview */}
                {showFileSelection && (
                    <View style={styles.fileSelectionOverlay}>
                        <SafeAreaView style={styles.fileSelectionModal} edges={['left', 'right', 'top', 'bottom']}>
                            <View style={styles.fileSelectionHeader}>
                                <Text style={styles.fileSelectionTitle}>Select X-ray Images</Text>
                                <TouchableOpacity onPress={cancelFileSelection} style={styles.fileSelectionCloseBtn}>
                                    <X stroke="#FFFFFF" width={24} height={24} />
                                </TouchableOpacity>
                            </View>

                            {selectableFiles.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <Text style={styles.emptyStateText}>No new X-ray images available</Text>
                                </View>
                            ) : (
                                <>
                                    {/* Preview Section */}
                                    <View style={styles.fileSelectionPreviewSection}>
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
                                                <Text style={styles.previewPlaceholderText}>Tap an image to preview</Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Thumbnails Section */}
                                    <View style={styles.fileSelectionThumbnailsSection}>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                            {selectableFiles.map((file, index) => (
                                                <TouchableOpacity
                                                    key={file.id}
                                                    style={[
                                                        styles.fileSelectionThumbnail,
                                                        previewImage === file.uri && styles.fileSelectionThumbnailActive
                                                    ]}
                                                    onPress={() => openImagePreview(file.uri)}
                                                    activeOpacity={0.9}
                                                >
                                                    <Image source={{ uri: file.uri }} style={styles.fileSelectionThumbImage} />
                                                    <TouchableOpacity
                                                        style={styles.fileSelectionCheckboxBtn}
                                                        onPress={() => toggleFileSelection(file.id)}
                                                    >
                                                        <View style={[
                                                            styles.fileSelectionCheckbox,
                                                            file.selected && styles.fileSelectionCheckboxChecked
                                                        ]}>
                                                            {file.selected && (
                                                                <Check stroke="white" width={12} height={12} />
                                                            )}
                                                        </View>
                                                    </TouchableOpacity>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>

                                    <View style={styles.fileSelectionFooter}>
                                        <Text style={styles.fileSelectionCount}>
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
