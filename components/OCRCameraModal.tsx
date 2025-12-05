import { CameraType, CameraView, FlashMode, useCameraPermissions } from 'expo-camera';
import { extractTextFromImage, isSupported } from 'expo-text-extractor';
import { Camera as CameraIcon, Copy, FlipHorizontal, X, Zap, ZapOff, Check } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { COLORS, SPACING } from '../constants/theme';

type OCRCameraModalProps = {
    visible: boolean;
    onClose: () => void;
};

const OCRCameraModal = ({ visible, onClose }: OCRCameraModalProps) => {
    const [permission, requestPermission] = useCameraPermissions();
    const [flash, setFlash] = useState<FlashMode>('off');
    const [facing, setFacing] = useState<CameraType>('back');
    const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
    const [extractedText, setExtractedText] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [copied, setCopied] = useState(false);
    const cameraRef = useRef<CameraView>(null);

    const toggleFlash = () => {
        setFlash((current) => (current === 'off' ? 'on' : 'off'));
    };

    const toggleCameraFacing = () => {
        setFacing((current) => (current === 'back' ? 'front' : 'back'));
    };

    const takePicture = async () => {
        if (cameraRef.current) {
            try {
                const photo = await cameraRef.current.takePictureAsync({
                    quality: 0.8,
                    base64: false,
                });

                if (photo?.uri) {
                    setCapturedPhoto(photo.uri);
                    await processOCR(photo.uri);
                } else {
                    throw new Error('Failed to capture photo');
                }
            } catch (error) {
                console.error('Camera error:', error);
                Alert.alert('Error', 'Failed to take picture');
            }
        }
    };

    const processOCR = async (imageUri: string) => {
        setIsProcessing(true);
        setExtractedText([]);

        try {
            if (!isSupported) {
                Alert.alert('Not Supported', 'OCR is not supported on this device');
                return;
            }

            const result = await extractTextFromImage(imageUri);
            setExtractedText(result);

            if (result.length === 0) {
                Alert.alert('No Text Found', 'No text was detected in the image');
            }
        } catch (error) {
            console.error('OCR error:', error);
            Alert.alert('OCR Error', 'Failed to extract text from image');
        } finally {
            setIsProcessing(false);
        }
    };

    const retakePicture = () => {
        setCapturedPhoto(null);
        setExtractedText([]);
        setCopied(false);
    };

    const copyToClipboard = async () => {
        const textToCopy = extractedText.join('\n');
        await Clipboard.setStringAsync(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleClose = () => {
        setCapturedPhoto(null);
        setExtractedText([]);
        setCopied(false);
        onClose();
    };

    if (!visible) return null;

    return (
        <View style={styles.fullScreenOverlay}>
            <View style={styles.modalContent}>
                {/* Permission not granted yet */}
                {!permission && (
                    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                    </SafeAreaView>
                )}

                {/* Request permission */}
                {permission && !permission.granted && (
                    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]}>
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
                    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background }]}>
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

                        {/* OCR Results */}
                        <View style={styles.ocrResultsContainer}>
                            <View style={styles.ocrHeader}>
                                <Text style={styles.ocrHeaderText}>Extracted Text</Text>
                                {extractedText.length > 0 && (
                                    <TouchableOpacity onPress={copyToClipboard} style={styles.copyButton}>
                                        {copied ? (
                                            <Check stroke={COLORS.success} width={20} height={20} />
                                        ) : (
                                            <Copy stroke={COLORS.primary} width={20} height={20} />
                                        )}
                                        <Text style={[styles.copyButtonText, copied && styles.copiedText]}>
                                            {copied ? 'Copied!' : 'Copy'}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            {isProcessing ? (
                                <View style={styles.processingContainer}>
                                    <ActivityIndicator size="large" color={COLORS.primary} />
                                    <Text style={styles.processingText}>Extracting text...</Text>
                                </View>
                            ) : (
                                <ScrollView style={styles.ocrTextScroll}>
                                    {extractedText.length > 0 ? (
                                        <Text style={styles.ocrText}>{extractedText.join('\n')}</Text>
                                    ) : (
                                        <Text style={styles.noTextMessage}>No text detected</Text>
                                    )}
                                </ScrollView>
                            )}
                        </View>

                        <View style={styles.previewActions}>
                            <TouchableOpacity
                                style={[styles.actionButton, styles.retakeButton]}
                                onPress={retakePicture}
                            >
                                <Text style={styles.retakeButtonText}>Retake</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionButton, styles.doneButton]}
                                onPress={handleClose}
                            >
                                <Text style={styles.doneButtonText}>Done</Text>
                            </TouchableOpacity>
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
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
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
    previewActions: {
        flexDirection: 'row',
        gap: SPACING.m,
        paddingHorizontal: SPACING.l,
        paddingVertical: SPACING.m,
        paddingBottom: SPACING.m + SPACING.l,
        backgroundColor: COLORS.background,
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
});

export default OCRCameraModal;
