import { gql, useMutation } from '@apollo/client';
import { CameraType, CameraView, FlashMode, useCameraPermissions } from 'expo-camera';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { extractTextFromImage } from 'expo-text-extractor';
import { Camera as CameraIcon, Check, Copy, FlipHorizontal, Plus, X, Zap, ZapOff } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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

// GraphQL mutation for creating airwaybill
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
    const [isProcessing, setIsProcessing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [xrayImages, setXrayImages] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const cameraRef = useRef<CameraView>(null);

    // Get session data for authorization
    const { session } = useAuth();

    // GraphQL mutation hook
    const [createAirwaybill] = useMutation(CREATE_AIRWAYBILL_MUTATION);

    const toggleFlash = () => {
        setFlash((current) => (current === 'off' ? 'on' : 'off'));
    };

    const toggleCameraFacing = () => {
        setFacing((current) => (current === 'back' ? 'front' : 'back'));
    };

    const pickXrayImages = async () => {
        Alert.alert(
            'Add X-ray Images',
            'Choose an option to add X-ray images',
            [
                {
                    text: 'Camera',
                    onPress: () => takeXrayImage(),
                },
                {
                    text: 'Gallery',
                    onPress: () => pickXrayFromGallery(),
                },
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
            ]
        );
    };

    const takeXrayImage = async () => {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        if (!permissionResult.granted) {
            Alert.alert('Permission Required', 'Please grant camera permissions to take X-ray images.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
        });

        if (!result.canceled && result.assets) {
            const newImage = result.assets[0].uri;
            setXrayImages(prev => [...prev, newImage]);
        }
    };

    const pickXrayFromGallery = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
            Alert.alert('Permission Required', 'Please grant camera roll permissions to upload X-ray images.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 0.8,
        });

        if (!result.canceled && result.assets) {
            const newImages = result.assets.map(asset => asset.uri);
            setXrayImages(prev => [...prev, ...newImages]);
        }
    };

    const removeXrayImage = (index: number) => {
        setXrayImages(prev => prev.filter((_, i) => i !== index));
    };

    // Function to upload image to API
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
            const response = await fetch('https://dev-app.paratekno.com/api/xray/upload', {
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
                enableAutoStabilization: true,
                enableAutoRedEye: true,
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

        let awb =
            joined.match(/\b\d{3}-\d{8}\b/)?.[0] ??
            (() => {
                const m = joined.match(/\b\d{3}\d{8}\b/);
                return m ? `${m[0].slice(0, 3)}-${m[0].slice(3)}` : null;
            })() ??
            joined.match(/\b\d{8}\b/)?.[0] ??
            null;

        if (awb) {
            setExtractedText(awb);
        } else {
            setExtractedText('');
            Alert.alert('AWB Not Found', 'Unable to detect AWB number');
        }

        console.log('📦 AWB:', awb);
    } catch (error) {
        console.error(error);
        Alert.alert('OCR Error', 'Failed to extract text');
    } finally {
        setIsProcessing(false);
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
      console.log('Handling Done with AWB:', session);
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
            // Step 1: Upload the captured photo
            const imagePath = await uploadImage(capturedPhoto);
            if (!imagePath) {
                throw new Error('Failed to upload AWB photo');
            }

            // Step 2: Create airwaybill record with GraphQL
            const { data } = await createAirwaybill({
                variables: {
                    input: {
                        airwaybill_number: extractedText.trim(),
                        photo_airwaybill: imagePath,
                    },
                },
            });
            console.log('Create airwaybill response:', data);

            if (data?.createAirwaybillXray) {
                // Success
                Alert.alert(
                    'Success',
                    'AWB has been saved successfully!',
                    [
                        {
                            text: 'OK',
                            onPress: () => {
                                if (onCaptureComplete) {
                                    onCaptureComplete(extractedText.trim(), xrayImages);
                                }
                                handleClose();
                            },
                        },
                    ]
                );
            } else {
                throw new Error('Failed to create AWB record - No data returned');
            }
        } catch (error) {
            console.error('Save error:', error);
            let errorMessage = 'Unable to save AWB. Please try again.';

            if (error instanceof Error) {
                if (error.message.includes('No authentication token')) {
                    errorMessage = 'Authentication required. Please log in again.';
                } else if (error.message.includes('Upload failed')) {
                    errorMessage = 'Failed to upload image. Please check your connection and try again.';
                } else if (error.message.includes('Failed to create AWB record')) {
                    errorMessage = 'Failed to save AWB data. Please try again.';
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
                {capturedPhoto && (
                    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]} edges={['left', 'right', 'top', 'bottom']}>
                        <View style={styles.previewContainer}>
                            <View style={styles.previewHeader}>
                                <Text style={styles.previewTitle}>OCR Result</Text>
                                <TouchableOpacity onPress={handleClose}>
                                    <X stroke={COLORS.text} width={24} height={24} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.imageContainer}>
                            <Image source={{ uri: capturedPhoto }} style={styles.previewImage} />
                        </View>

                        <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
                            {/* AWB Number Form */}
                            <View style={styles.formContainer}>
                                <Text style={styles.formLabel}>AWB Number</Text>
                                <View style={styles.inputContainer}>
                                    <TextInput
                                        style={styles.textInput}
                                        value={extractedText}
                                        onChangeText={setExtractedText}
                                        placeholder="Enter AWB number"
                                        placeholderTextColor={COLORS.textSecondary}
                                        editable={!isProcessing}
                                    />
                                    {extractedText && (
                                        <TouchableOpacity onPress={copyToClipboard} style={styles.copyButton}>
                                            {copied ? (
                                                <Check stroke={COLORS.success} width={20} height={20} />
                                            ) : (
                                                <Copy stroke={COLORS.primary} width={20} height={20} />
                                            )}
                                        </TouchableOpacity>
                                    )}
                                </View>
                                {isProcessing && (
                                    <View style={styles.processingContainer}>
                                        <ActivityIndicator size="small" color={COLORS.primary} />
                                        <Text style={styles.processingText}>Extracting text...</Text>
                                    </View>
                                )}
                            </View>

                            {/* X-ray Images Upload */}
                            <View style={styles.uploadContainer}>
                                <Text style={styles.formLabel}>X-ray Image</Text>
                                <TouchableOpacity onPress={pickXrayImages} style={styles.uploadButton}>
                                    <Plus stroke={COLORS.primary} width={24} height={24} />
                                    <Text style={styles.uploadButtonText}>Add X-ray Images</Text>
                                </TouchableOpacity>

                                {xrayImages.length > 0 && (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
                                        {xrayImages.map((uri, index) => (
                                            <View key={index} style={styles.imagePreviewContainer}>
                                                <Image source={{ uri }} style={styles.xrayImagePreview} />
                                                <TouchableOpacity
                                                    onPress={() => removeXrayImage(index)}
                                                    style={styles.removeImageButton}
                                                >
                                                    <X stroke={COLORS.white} width={16} height={16} />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </ScrollView>
                                )}
                            </View>
                        </ScrollView>

                        {/* Fixed Bottom Actions */}
                        <View style={styles.bottomActionsContainer}>
                            <View style={styles.previewActions}>
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.retakeButton]}
                                    onPress={retakePicture}
                                >
                                    <Text style={styles.retakeButtonText}>Retake</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.actionButton,
                                        styles.doneButton,
                                        isSaving && styles.disabledButton
                                    ]}
                                    onPress={handleDone}
                                    disabled={isSaving || isProcessing}
                                >
                                    {isSaving ? (
                                        <View style={styles.loadingContainer}>
                                            <ActivityIndicator size="small" color={COLORS.white} />
                                            <Text style={[styles.doneButtonText, { marginLeft: 8 }]}>
                                                Saving...
                                            </Text>
                                        </View>
                                    ) : (
                                        <Text style={styles.doneButtonText}>Done</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </SafeAreaView>
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
        width: '100%',
        height: '100%',
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
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        // Larger hit area without changing visual size
        padding: 8,
        margin: -8,
    },
    ocrBadge: {
        backgroundColor: 'rgba(2, 132, 199, 0.9)',
        paddingHorizontal: SPACING.m,
        paddingVertical: SPACING.xs,
        borderRadius: SPACING.m,
    },
    ocrBadgeText: {
        color: COLORS.white,
        fontSize: 14,
        fontWeight: '600',
    },
    flipButton: {
        backgroundColor: 'rgba(0,0,0,0.5)',
        // Larger hit area without changing visual size
        padding: 8,
        margin: -8,
    },
    placeholderButton: {
        backgroundColor: 'transparent',
    },
    scanArea: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
    },
    corner: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderColor: COLORS.white,
    },
    topLeft: {
        top: 0,
        left: 20,
        borderTopWidth: 3,
        borderLeftWidth: 3,
    },
    topRight: {
        top: 0,
        right: 20,
        borderTopWidth: 3,
        borderRightWidth: 3,
    },
    bottomLeft: {
        bottom: 0,
        left: 20,
        borderBottomWidth: 3,
        borderLeftWidth: 3,
    },
    bottomRight: {
        bottom: 0,
        right: 20,
        borderBottomWidth: 3,
        borderRightWidth: 3,
    },
    scanHint: {
        color: COLORS.white,
        fontSize: 14,
        marginTop: SPACING.m,
        textAlign: 'center',
        opacity: 0.8,
    },
    bottomControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.xl,
        paddingBottom: SPACING.xl + SPACING.m,
    },
    captureButton: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: 'rgba(255,255,255,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        // Larger hit area without changing visual size
        padding: 8,
        margin: -8,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    captureInner: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: COLORS.white,
    },
    previewContainer: {
        backgroundColor: COLORS.background,
    },
    previewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.m,
        marginTop: SPACING.m,
        paddingVertical: SPACING.s,
    },
    previewTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    imageContainer: {
        height: 200,
        backgroundColor: COLORS.black,
    },
    previewImage: {
        flex: 1,
        resizeMode: 'contain',
    },
    ocrResultsContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
        padding: SPACING.m,
    },
    ocrHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.s,
    },
    ocrHeaderText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    copyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: SPACING.s,
        paddingVertical: SPACING.xs,
    },
    copyButtonText: {
        color: COLORS.primary,
        fontSize: 14,
        fontWeight: '500',
    },
    copiedText: {
        color: COLORS.success,
    },
    processingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    processingText: {
        marginTop: SPACING.m,
        color: COLORS.textSecondary,
        fontSize: 14,
    },
    ocrTextScroll: {
        flex: 1,
        backgroundColor: COLORS.white,
        borderRadius: SPACING.m,
        padding: SPACING.m,
    },
    ocrText: {
        fontSize: 14,
        lineHeight: 22,
        color: COLORS.text,
    },
    noTextMessage: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginTop: SPACING.l,
    },
    contentScroll: {
        flex: 1,
    },
    bottomActionsContainer: {
        backgroundColor: COLORS.background,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingHorizontal: SPACING.l,
        paddingVertical: SPACING.m,
        paddingBottom: SPACING.m + SPACING.l,
    },
    previewActions: {
        flexDirection: 'row',
        gap: SPACING.m,
    },
    actionButton: {
        flex: 1,
        paddingVertical: SPACING.m,
        borderRadius: SPACING.m,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 50,
    },
    retakeButton: {
        backgroundColor: COLORS.gray,
    },
    retakeButtonText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '600',
    },
    doneButton: {
        backgroundColor: COLORS.primary,
    },
    doneButtonText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '600',
    },
    // Form styles
    formContainer: {
        backgroundColor: COLORS.background,
        padding: SPACING.m,
        marginBottom: SPACING.s,
    },
    formLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: SPACING.s,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: SPACING.m,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: SPACING.m,
    },
    textInput: {
        flex: 1,
        fontSize: 16,
        color: COLORS.text,
        paddingVertical: SPACING.m,
    },
    // Upload styles
    uploadContainer: {
        backgroundColor: COLORS.background,
        padding: SPACING.m,
        paddingBottom: SPACING.xl,
    },
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.white,
        borderRadius: SPACING.m,
        borderWidth: 2,
        borderColor: COLORS.primary,
        borderStyle: 'dashed',
        paddingVertical: SPACING.l,
        gap: SPACING.s,
    },
    uploadButtonText: {
        fontSize: 16,
        color: COLORS.primary,
        fontWeight: '600',
    },
    imageScroll: {
        paddingTop: SPACING.xl,
        paddingBottom: SPACING.l,
    },
    imagePreviewContainer: {
        marginRight: SPACING.m,
        position: 'relative',
    },
    xrayImagePreview: {
        width: 80,
        height: 80,
        borderRadius: SPACING.s,
        backgroundColor: COLORS.gray,
    },
    removeImageButton: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: COLORS.error,
        borderRadius: 12,
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    disabledButton: {
        backgroundColor: COLORS.gray,
        opacity: 0.7,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default OCRCameraModal;
