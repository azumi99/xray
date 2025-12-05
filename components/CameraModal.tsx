import type { CameraCapturedPicture } from 'expo-camera';
import { CameraType, CameraView, FlashMode, useCameraPermissions } from 'expo-camera';
import { Camera as CameraIcon, FlipHorizontal, X, Zap, ZapOff } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../constants/theme';
import AWBModal from './AWBModal';

type CameraModalProps = {
    visible: boolean;
    onClose: () => void;
};

const CameraModal = ({ visible, onClose }: CameraModalProps) => {
    const [permission, requestPermission] = useCameraPermissions();
    const [flash, setFlash] = useState<FlashMode>('off');
    const [facing, setFacing] = useState<CameraType>('back');
    const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
    
    const [capturedPhotoData, setCapturedPhotoData] = useState<CameraCapturedPicture | null>(null);
    const [showAWBModal, setShowAWBModal] = useState(false);
    type ApiResult = {
        success: boolean;
        awbId?: string;
        awbNumber?: string;
        photoUrl?: string;
        extractedText?: string;
        confidence?: number;
        error?: string;
    } | null;

    const [apiResult, setApiResult] = useState<ApiResult>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const cameraRef = useRef<CameraView>(null);

    const toggleFlash = () => {
        setFlash((current) => (current === 'off' ? 'on' : 'off'));
    };

    const toggleCameraFacing = () => {
        setFacing((current) => (current === 'back' ? 'front' : 'back'));
    };

    const processImageWithUri = async (imageUri: string) => {
        try {
            console.log('Processing image with API...');

            // Create FormData with proper file format for React Native
            const formData = new FormData();

            let fileName = 'image.png';
            let mimeType = 'image/png';

            // Check if it's a HEIC file (common on iOS)
            if (imageUri.toLowerCase().includes('.heic')) {
                console.log('HEIC detected, forcing PNG conversion...');
                fileName = 'image.png';
                mimeType = 'image/png';
            }

            // For React Native, use the file URI directly
            const uri = imageUri.startsWith('file://') ? imageUri : `file://${imageUri}`;

            // @ts-ignore: React Native FormData allows this object format
            formData.append('image', {
                uri: uri,
                type: mimeType,
                name: fileName,
            });

            console.log('Sending image to API...');

            const apiUrl = process.env.EXPO_PUBLIC_AWB_API_URL || 'https://n8n-0mkotfm4evfi.n8x.biz.id/webhook/airwaybill';
            const apiKey = process.env.EXPO_PUBLIC_AWB_API_KEY || '__n8n_BLANK_VALUE_e5362baf-c777-4d57-a609-6eaf1f9e87f6';

            const apiResponse = await fetch(apiUrl, {
                method: 'POST',
                body: formData,
                headers: {
                    'x-api-key': apiKey,
                },
            });

            console.log('API Response status:', apiResponse.status);

            if (!apiResponse.ok) {
                const errorText = await apiResponse.text();
                console.log('Error response:', errorText);
                throw new Error(`HTTP error! status: ${apiResponse.status}`);
            }

            const result = await apiResponse.json();
            console.log('API Result:', result);

            return result;

        } catch (error) {
            console.error('❌ API Error:', error);
            throw error;
        }
    };

    const takePicture = async () => {
        if (cameraRef.current) {
            try {
                // Force JPEG format on iOS to avoid HEIC issues
                const photoOptions = {
                    quality: 0.8,
                    base64: true,
                    skipProcessing: false,
                };

                // On iOS, consider converting HEIC to PNG after capture if needed
                // takePictureAsync does not support imageType option

                const photo = await cameraRef.current.takePictureAsync(photoOptions);

                if (photo.uri) {
                    console.log('Photo captured:', photo.uri);
                    setCapturedPhoto(photo.uri);
                    setCapturedPhotoData(photo);
                } else {
                    throw new Error('Failed to capture photo - no URI returned');
                }
            } catch (error) {
                console.error('Camera error:', error);
                Alert.alert('Error', 'Failed to take picture');
            }
        }
    };

    const retakePicture = () => {
        setCapturedPhoto(null);
        setCapturedPhotoData(null);
        setApiResult(null);
    };

    const confirmPhoto = async () => {
        if (capturedPhotoData) {
            setIsProcessing(true);
            setApiResult(null);

            try {
                // Use the file URI directly for the API
                console.log('Processing captured photo...');
                const result = await processImageWithUri(capturedPhotoData.uri);

                // Handle the new API response format
                // Check if result is an array and has data
                if (result && Array.isArray(result) && result.length > 0 && result[0].data && result[0].data.updateAirwaybillXray) {
            const awbData = result[0].data.updateAirwaybillXray;
                    console.log('✅ Airwaybill created:', awbData);

                    // Check if ID is not empty string to show AWB modal
                    if (awbData.id && awbData.id !== "") {
                        // Pass the ID to AWBModal for polling
                        setApiResult({
                            success: true,
                            awbId: awbData.id,
                            awbNumber: awbData.airwaybill_number || '0',
                            photoUrl: awbData.photo_airwaybill,
                            confidence: 0.95
                        });
                    }
                } else {
                    setApiResult({
                        success: false,
                        error: 'Failed to create airwaybill record',
                    });
                    console.log('❌ Failed to create airwaybill');
                }
            } catch (error) {
                Alert.alert('Error', 'Failed to process image');
                console.error('Processing error:', error);
            } finally {
                setIsProcessing(false);
            }
        }
        setShowAWBModal(true);
    };

    interface AWBData {
      awbNumber: string;
      xrayImages?: string[];
      imageUri?: string;
    }

    interface ShipmentData {
      awbNumber: string;
      xrayImages: string[];
      createdAt: string;
    }

    const handleAWBConfirm = (awbData: AWBData) => {
      // Save directly without going to Detail screen
      console.log('Saving AWB data:', awbData);

      const shipmentData: ShipmentData = {
        awbNumber: awbData.awbNumber,
        xrayImages: awbData.xrayImages || [awbData.imageUri || capturedPhoto].filter((img): img is string => !!img),
        createdAt: new Date().toISOString(),
      };

      // Mock save - in real app, save to database/API
      Alert.alert(
        'Success',
        `Shipment ${awbData.awbNumber} saved successfully with ${shipmentData.xrayImages.length} images`,
        [
          {
            text: 'OK',
            onPress: () => {
              setShowAWBModal(false);
              onClose();
              // Reset for next capture
              setCapturedPhoto(null);
              setCapturedPhotoData(null);
              setApiResult(null);
            }
          }
        ]
      );
    };

    const handleAWBClose = () => {
        setShowAWBModal(false);
    };

    if (!visible) return null;

    // Make modal fullscreen
    return (
        <View style={styles.fullScreenOverlay}>
            {showAWBModal ? (
                <AWBModal
                    visible={showAWBModal}
                    onClose={handleAWBClose}
                    onConfirm={handleAWBConfirm}
                    imageUri={capturedPhoto || ''}
                    initialResult={apiResult ?? undefined}
                />
            ) : (
                <View style={styles.modalContent}>
                    <>
                        {(!permission) && (
                            <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]}>
                                <ActivityIndicator size="large" color={COLORS.primary} />
                            </SafeAreaView>
                        )}

                        {(permission && !permission.granted) && (
                            <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]}>
                                <View style={styles.permissionContainer}>
                                    <CameraIcon width={64} height={64} color={COLORS.gray} />
                                    <Text style={styles.permissionTitle}>Camera Permission Required</Text>
                                    <Text style={styles.permissionText}>
                                        We need access to your camera to scan receipts
                                    </Text>
                                    <TouchableOpacity onPress={requestPermission} style={styles.permissionButton}>
                                        <Text style={styles.permissionButtonText}>Allow Camera Access</Text>
                                    </TouchableOpacity>
                                </View>
                            </SafeAreaView>
                        )}

                        {permission && permission.granted && !capturedPhoto && (
                            <SafeAreaView style={styles.container}>
                                <CameraView style={styles.camera} facing={facing} flash={flash} ref={cameraRef}>
                                    <View style={styles.safeAreaWrapper}>
                                        <View style={styles.controlsContainer}>
                                            <View style={styles.topControls}>
                                                <TouchableOpacity onPress={onClose} style={styles.iconButton}>
                                                    <X stroke={COLORS.white} width={24} height={24} />
                                                </TouchableOpacity>
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

                        {capturedPhoto && (
                            <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]}>
                                <View style={styles.previewContainer}>
                                    <View style={styles.previewHeader}>
                                        <Text style={styles.previewTitle}>Review Photo</Text>
                                        <TouchableOpacity onPress={retakePicture}>
                                            <X stroke={COLORS.text} width={24} height={24} />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.imageContainer}>
                                    <Image source={{ uri: capturedPhoto }} style={styles.previewImage} />
                                </View>

                                <View style={styles.previewActions}>
                                    <TouchableOpacity
                                        style={[styles.actionButton, styles.retakeButton]}
                                        onPress={retakePicture}
                                    >
                                        <Text style={styles.retakeButtonText}>Retake</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.actionButton, styles.confirmButton]}
                                        onPress={confirmPhoto}
                                        disabled={isProcessing}
                                    >
                                        {isProcessing ? (
                                            <ActivityIndicator size="small" color={COLORS.white} />
                                        ) : (
                                            <Text style={styles.confirmButtonText}>Use Photo</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </SafeAreaView>
                        )}
                    </>
                </View>
            )}
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
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '100%',
        height: '100%',
        backgroundColor: 'black',
        overflow: 'hidden',
    },
    container: {
        flex: 1,
        backgroundColor: COLORS.black,
    },
    camera: {
        flex: 1,
    },
    // Permission styles
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
        alignItems: 'center',
    },
    permissionButtonText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '600',
    },
    // Camera controls
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
        backgroundColor: 'transparent',
        // marginTop: SPACING.s,
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    flipButton: {
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    placeholderButton: {
        backgroundColor: 'transparent',
    },
    // Scan area
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
    // Bottom controls
    bottomControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.xl,
        paddingBottom: SPACING.xl + SPACING.m,
    },
    captureButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    captureInner: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: COLORS.white,
    },
    // Preview styles
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
        flex: 1,
        backgroundColor: COLORS.black,
    },
    previewImage: {
        flex: 1,
        resizeMode: 'contain',
    },
    previewActions: {
        flexDirection: 'row',
        gap: SPACING.m,
        paddingHorizontal: SPACING.l,
        paddingVertical: SPACING.m,
        paddingBottom: SPACING.m + SPACING.l, // Extra padding for Android navigation bar
        backgroundColor: COLORS.background,
    },
    actionButton: {
        flex: 1,
        paddingVertical: SPACING.m,
        paddingHorizontal: SPACING.m,
        borderRadius: SPACING.m,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 50, // Ensure minimum touch target size
    },
    retakeButton: {
        backgroundColor: COLORS.gray,
    },
    retakeButtonText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '600',
    },
    confirmButton: {
        backgroundColor: COLORS.primary,
    },
    confirmButtonText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '600',
    },
});

export default CameraModal;