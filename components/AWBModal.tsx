import * as ImagePicker from 'expo-image-picker';
import { Camera, Check, Package, Plus, Trash2, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../constants/theme';

class OCRService {
    static async recognizeText(imageUri: any, retryCount = 0): Promise<{ success: boolean; text?: string; awbNumber?: string; confidence?: number; error?: string }> {
        try {
            let uri = imageUri;

            if (Platform.OS === 'android' && !uri.startsWith('file://')) {
                uri = 'file://' + uri;
            }

            const formData = new FormData();
            const uriParts = uri.split('.');
            const fileType = uriParts[uriParts.length - 1].toLowerCase();

            const file: any = {
                uri: uri,
                type: fileType === 'png' ? 'image/png' : 'image/jpeg',
                name: `photo.${fileType}`,
            };
            formData.append('image', file);

            console.log('📤 Sending to API:', uri);

            const apiUrl = process.env.EXPO_PUBLIC_AWB_API_URL || 'https://n8n-0mkotfm4evfi.n8x.biz.id/webhook/airwaybill';
            const apiKey = process.env.EXPO_PUBLIC_AWB_API_KEY || '__n8n_BLANK_VALUE_e5362baf-c777-4d57-a609-6eaf1f9e87f6';

            const response = await fetch(apiUrl, {
                method: 'POST',
                body: formData,
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'x-api-key': apiKey,
                },
            });

            console.log('📥 Status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error response:', errorText);

                // Retry logic for server errors (5xx) or network issues
                if ((response.status >= 500 || response.status === 0) && retryCount < 3) {
                    console.log(`🔄 Retrying... Attempt ${retryCount + 1}/3`);
                    await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1))); // Exponential backoff
                    return OCRService.recognizeText(imageUri, retryCount + 1);
                }

                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            console.log('✅ Result:', JSON.stringify(result, null, 2));

            if (result?.data?.awb_numbers?.length > 0) {
                const awbNumber = result.data.awb_numbers[0];
                return {
                    success: true,
                    text: awbNumber,
                    awbNumber: awbNumber,
                    confidence: 0.95,
                };
            }

            if (result?.data?.extracted_text) {
                const awbPattern = /\b\d{10,12}\b/g;
                const matches = result.data.extracted_text.match(awbPattern);
                console.log('🔍 Extracted Text Matches:', matches);

                if (matches?.[0]) {
                    return {
                        success: true,
                        text: matches[0],
                        awbNumber: matches[0],
                        confidence: 0.7,
                    };
                }
            }

            return {
                success: false,
                error: 'Tidak ditemukan AWB number',
            };

        } catch (error) {
            console.error('❌ OCR Error:', error);

            // Retry for network errors
            if (retryCount < 3 && (error as Error).message.includes('Network request failed')) {
                console.log(`🔄 Retrying due to network error... Attempt ${retryCount + 1}/3`);
                await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)));
                return OCRService.recognizeText(imageUri, retryCount + 1);
            }

            return {
                success: false,
                error: (error as Error).message || 'Gagal memproses gambar',
            };
        }
    }
}

interface AWBModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (data: { awbNumber: string; imageUri: string; xrayImages: string[] }) => void;
    imageUri: string;
    initialResult?: { success: boolean; awbId?: string; awbNumber?: string; photoUrl?: string; error?: string; confidence?: number };
}

const AWBModal = ({ visible, onClose, onConfirm, imageUri, initialResult }: AWBModalProps) => {
    const [awbNumber, setAwbNumber] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [ocrProgress, setOcrProgress] = useState(0);
    const [processingText, setProcessingText] = useState('');
    const [xrayImages, setXrayImages] = useState([imageUri]); // Initialize with the main image
    const [isPolling, setIsPolling] = useState(false);
    const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
    const [awbId, setAwbId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (imageUri) {
            setXrayImages([imageUri]); // Reset when imageUri changes
        }
    }, [imageUri]);

    useEffect(() => {
        return () => {
            // Cleanup polling on unmount
            if (pollingInterval) {
                clearInterval(pollingInterval);
                setPollingInterval(null);
            }
        };
    }, [pollingInterval]);

    useEffect(() => {
        if (visible && imageUri) {
            if (initialResult) {
                console.log('Using initial result:', initialResult);

                if (initialResult.success && initialResult.awbId) {
                    setAwbId(initialResult.awbId);
                    setAwbNumber(initialResult.awbNumber || '0');

                    // Start polling if awbNumber is '0'
                    if (initialResult.awbNumber === '0') {
                        setIsLoading(true);
                        startPolling(initialResult.awbId);
                    }
                    // Don't show any error message - just open the modal
                }
            }
        }
    }, [visible, imageUri, initialResult]);

    const processImage = async () => {
        if (!imageUri) return;

        setIsProcessing(true);
        setOcrProgress(0);
        setProcessingText('Initializing OCR...');

        try {
            console.log('Processing image:', imageUri);

            // Simulate progress updates
            const progressInterval = setInterval(() => {
                setOcrProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return 90;
                    }
                    return prev + 10;
                });

                // Update processing text based on progress
                const currentProgress = ocrProgress;
                if (currentProgress < 30) {
                    setProcessingText('Analyzing image...');
                } else if (currentProgress < 60) {
                    setProcessingText('Extracting text...');
                } else if (currentProgress < 90) {
                    setProcessingText('Finding AWB number...');
                }
            }, 100);

            const result = await OCRService.recognizeText(imageUri);

            clearInterval(progressInterval);
            setOcrProgress(100);
            setProcessingText('Processing complete...');

            setTimeout(() => {
                setIsProcessing(false);
                setOcrProgress(0);
                setProcessingText('');

                if (result.success) {
                    setAwbNumber(result.awbNumber || '');
                    const confidence = typeof result.confidence === 'number' ? result.confidence : 0.95;
                    Alert.alert(
                        '✅ AWB Detected',
                        `Found: ${result.awbNumber}\nConfidence: ${Math.round(confidence * 100)}%`,
                        [{ text: 'OK' }]
                    );
                } else {
                    Alert.alert(
                        '⚠️ OCR Error',
                        result.error || 'Failed to process image',
                        [
                            { text: 'Try Again', onPress: handleRetryOCR },
                            { text: 'Manual Entry', style: 'cancel' }
                        ]
                    );
                }
            }, 500);

        } catch (error) {
            console.error('OCR Error:', error);
            setIsProcessing(false);
            setOcrProgress(0);
            setProcessingText('');
            Alert.alert(
                '⚠️ OCR Error',
                (error as Error).message || 'Failed to process image',
                [
                    { text: 'Try Again', onPress: handleRetryOCR },
                    { text: 'Manual Entry', style: 'cancel' }
                ]
            );
        }
    };

    const startPolling = (id: string) => {
        setIsPolling(true);
        setProcessingText('Waiting for AWB number...');
        console.log('Starting polling for ID:', id);

        const interval = setInterval(async () => {
            try {
                const result = await checkAirwaybillNumber(id);
                console.log('Polling result:', result);

                if (result && result !== '0') {
                    // Stop polling when we get a non-zero AWB number
                    console.log('AWB number found, stopping polling:', result);
                    
                     clearInterval(pollingInterval);
                    setPollingInterval(null);
                    
                    setIsPolling(false);
                    setIsLoading(false);
                    setAwbNumber(result);
                    setProcessingText('');

                    Alert.alert(
                        '✅ AWB Number Found',
                        `AWB: ${result}`,
                        [{ text: 'OK' }]
                    );
                } else {
                    console.log('AWB number still 0, continuing to poll...');
                }
            } catch (error) {
                console.error('Polling error:', error);
            }
        }, 5000); // Poll every 5 seconds

        setPollingInterval(interval as any);
    };

    const checkAirwaybillNumber = async (id: string): Promise<string> => {
        try {
            const query = `
              {
                airwaybillXray(id: "${id}") {
                  id
                  airwaybill_number
                  photo_airwaybill
                  created_at
                  updated_at
                }
              }
            `;


            const response = await fetch('https://dev-app.paratekno.com/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer 36|d3jnqOpu0jtsphLb3otaPzVHMihPFBUGcc2ODHRg2b3d2eaf`,
                },
                body: JSON.stringify({
                    query,
                    variables: { id }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('GraphQL result:', result);

            if (result?.data?.airwaybillXray?.airwaybill_number) {
                return result.data.airwaybillXray.airwaybill_number;
            }

            return '0';
        } catch (error) {
            console.error('Error checking airwaybill number:', error);
            return '0';
        }
    };

    const handleConfirm = () => {
        if (!awbNumber.trim()) {
            Alert.alert('Error', 'Please enter AWB number');
            return;
        }

        onConfirm({
            awbNumber: awbNumber.trim(),
            imageUri,
            xrayImages,
        });
    };

    const handleCancel = () => {
        // Cleanup polling when modal is closed
        if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
        }
        setIsPolling(false);
        setIsLoading(false);
        setAwbNumber('');
        setAwbId(null);
        onClose();
    };

    const handleRetryOCR = () => {
        setAwbNumber('');
        processImage();
    };

    const addXrayImage = async () => {
        // Ask for permission
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Camera permission is required to take photos');
            return;
        }

        Alert.alert('Add Xray Image', 'Choose source', [
            {
                text: 'Camera',
                onPress: async () => {
                    let result = await ImagePicker.launchCameraAsync({
                        mediaTypes: ImagePicker.MediaTypeOptions.Images,
                        quality: 0.8,
                    });
                    if (!result.canceled) {
                        setXrayImages([...xrayImages, result.assets[0].uri]);
                    }
                }
            },
            {
                text: 'Gallery',
                onPress: async () => {
                    let result = await ImagePicker.launchImageLibraryAsync({
                        mediaTypes: ImagePicker.MediaTypeOptions.Images,
                        quality: 0.8,
                    });
                    if (!result.canceled) {
                        setXrayImages([...xrayImages, result.assets[0].uri]);
                    }
                }
            },
            { text: 'Cancel', style: 'cancel' },
        ]);
    };

    const removeXrayImage = (index: any) => {
        // Don't allow removing the first image (main AWB image)
        if (index === 0) {
            Alert.alert('Cannot Remove', 'The main AWB image cannot be removed');
            return;
        }
        const newImages = [...xrayImages];
        newImages.splice(index, 1);
        setXrayImages(newImages);
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
        >
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
                            <X stroke={COLORS.text} width={24} height={24} />
                        </TouchableOpacity>
                        <View style={styles.headerContent}>
                            <Text style={styles.headerTitle}>AWB Information</Text>
                            <Text style={styles.headerSubtitle}>Fill in shipment details</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={[styles.confirmButton, (!awbNumber.trim() || awbNumber === '0') && styles.confirmButtonDisabled]}
                        onPress={handleConfirm}
                        disabled={!awbNumber.trim() || awbNumber === '0' || isProcessing || isLoading}
                    >
                        <Check stroke={COLORS.white} width={20} height={20} />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Image Preview at the top */}
                    {imageUri && (
                        <View style={styles.imagePreviewSection}>
                            <Text style={styles.fieldLabel}>Captured Image</Text>
                            <View style={styles.imagePreviewContainer}>
                                <Image source={{ uri: imageUri }} style={styles.previewImage} />
                            </View>
                        </View>
                    )}

                    {(isProcessing || isPolling) && (
                        <View style={styles.processingContainer}>
                            <View style={styles.processingContent}>
                                <ActivityIndicator size="large" color={COLORS.primary} />
                                <Text style={styles.processingText}>
                                    {isProcessing ? 'Processing image...' : 'Checking AWB number...'}
                                </Text>
                                <Text style={styles.processingSubtext}>
                                    {isProcessing ? (processingText || 'Initializing...') : 'Waiting for airwaybill number assignment...'}
                                </Text>

                                {/* Progress Bar */}
                                {isProcessing && (
                                    <>
                                        <View style={styles.progressBarContainer}>
                                            <View style={[styles.progressBar, { width: `${ocrProgress}%` }]} />
                                        </View>
                                        <Text style={styles.progressPercent}>{Math.round(ocrProgress)}%</Text>
                                    </>
                                )}

                                {/* Polling indicator */}
                                {isPolling && (
                                    <View style={styles.pollingIndicator}>
                                        <Text style={styles.pollingText}>
                                            Checking every 5 seconds for AWB number...
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    )}

                    <View style={styles.formSection}>
                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>AWB Number *</Text>
                            <View style={styles.inputContainer}>
                                <Package stroke={COLORS.gray} width={20} height={20} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.textInput}
                                    placeholder={isLoading ? "Loading..." : "Enter AWB number"}
                                    placeholderTextColor={COLORS.gray}
                                    value={awbNumber}
                                    onChangeText={setAwbNumber}
                                    autoCapitalize="characters"
                                    autoCorrect={false}
                                    editable={!isProcessing && !isLoading}
                                />
                                {isLoading && (
                                    <ActivityIndicator size="small" color={COLORS.primary} style={styles.loadingIcon} />
                                )}
                            </View>
                            {awbNumber.trim() && !isLoading && (
                                <View style={styles.validIndicator}>
                                    <Check stroke={COLORS.success} width={16} height={16} />
                                    <Text style={styles.validText}>Valid format</Text>
                                </View>
                            )}

                            {!isProcessing && (
                                <View style={styles.retrySection}>
                                    <TouchableOpacity
                                        style={styles.retryButton}
                                        onPress={handleRetryOCR}
                                    >
                                        <Camera stroke={COLORS.primary} width={16} height={16} />
                                        <Text style={styles.retryButtonText}>Retry Image Analysis</Text>
                                    </TouchableOpacity>
                                    <Text style={styles.retrySubtext}>
                                        Didn't detect correctly? Try scanning again
                                    </Text>
                                </View>
                            )}

                            {/* Xray Images Section */}
                            <View style={styles.xrayImagesSection}>
                                <View style={styles.xrayImagesHeader}>
                                    <Text style={styles.xrayImagesLabel}>Xray Images ({xrayImages.length})</Text>
                                    <TouchableOpacity onPress={addXrayImage} style={styles.addImageButton}>
                                        <Plus stroke={COLORS.primary} width={18} height={18} />
                                        <Text style={styles.addImageText}>Add</Text>
                                    </TouchableOpacity>
                                </View>

                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.xrayImagesScroll}>
                                    {xrayImages.map((uri, index) => (
                                        <View key={index} style={styles.xrayImageContainer}>
                                            <Image source={{ uri }} style={styles.xrayImage} />
                                            {index !== 0 && (
                                                <TouchableOpacity
                                                    style={styles.xrayDeleteButton}
                                                    onPress={() => removeXrayImage(index)}
                                                >
                                                    <Trash2 stroke={COLORS.white} width={12} height={12} />
                                                </TouchableOpacity>
                                            )}
                                            {index === 0 && (
                                                <View style={styles.mainImageLabel}>
                                                    <Text style={styles.mainImageText}>MAIN</Text>
                                                </View>
                                            )}
                                        </View>
                                    ))}
                                </ScrollView>
                            </View>
                        </View>
                    </View>
                </ScrollView>

                <View style={styles.bottomActions}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.saveButton]}
                        onPress={handleConfirm}
                        disabled={!awbNumber.trim() || awbNumber === '0' || isProcessing || isLoading}
                    >
                        <Text style={styles.saveButtonText}>
                            {isLoading ? 'Loading...' : awbNumber === '0' ? 'Waiting for AWB...' : 'Save Shipment'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.m,
        paddingVertical: SPACING.s,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    closeButton: {
        padding: SPACING.s,
        marginRight: SPACING.s,
    },
    headerContent: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    headerSubtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    confirmButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmButtonDisabled: {
        backgroundColor: COLORS.gray,
        opacity: 0.5,
    },
    content: {
        flex: 1,
        padding: SPACING.m,
    },
    processingContainer: {
        padding: SPACING.l,
        backgroundColor: COLORS.surface,
        borderRadius: SPACING.m,
        marginBottom: SPACING.m,
    },
    processingContent: {
        alignItems: 'center',
    },
    processingText: {
        marginTop: SPACING.m,
        fontSize: 16,
        color: COLORS.text,
        fontWeight: '500',
        textAlign: 'center',
    },
    processingSubtext: {
        marginTop: SPACING.xs,
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    formSection: {
        gap: SPACING.l,
    },
    fieldGroup: {
        gap: SPACING.s,
    },
    fieldLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: SPACING.m,
        paddingHorizontal: SPACING.m,
    },
    inputIcon: {
        marginRight: SPACING.s,
    },
    loadingIcon: {
        marginRight: SPACING.s,
    },
    textInput: {
        flex: 1,
        fontSize: 16,
        color: COLORS.text,
        paddingVertical: SPACING.m,
        backgroundColor: COLORS.surface,
        borderRadius: SPACING.m,
        paddingHorizontal: SPACING.m,
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    validIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.s,
        marginTop: SPACING.s,
    },
    validText: {
        fontSize: 14,
        color: COLORS.success,
        fontWeight: '500',
    },
    extractedTextContainer: {
        backgroundColor: COLORS.surface,
        borderRadius: SPACING.m,
        padding: SPACING.m,
        maxHeight: 120,
    },
    extractedTextContent: {
        fontSize: 14,
        color: COLORS.textSecondary,
        fontFamily: 'monospace',
    },
    imagePreviewSection: {
        marginBottom: SPACING.l,
        gap: SPACING.s,
    },
    imagePreviewContainer: {
        backgroundColor: COLORS.surface,
        borderRadius: SPACING.m,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    previewImage: {
        width: '100%',
        height: 200,
        resizeMode: 'cover',
    },
    // Progress bar styles
        progressBarContainer: {
            width: '100%',
            height: 8,
            backgroundColor: COLORS.gray + '30',
            borderRadius: 4,
            marginTop: SPACING.m,
            overflow: 'hidden',
        },
        progressBar: {
            height: '100%',
            backgroundColor: COLORS.primary,
            borderRadius: 4,
        },
        progressPercent: {
            marginTop: SPACING.s,
            fontSize: 14,
            color: COLORS.primary,
            fontWeight: '600',
        },
        pollingIndicator: {
            marginTop: SPACING.m,
            padding: SPACING.s,
            backgroundColor: COLORS.primary + '15',
            borderRadius: SPACING.s,
        },
        pollingText: {
            fontSize: 14,
            color: COLORS.primary,
            textAlign: 'center',
            fontWeight: '500',
        },
    bottomActions: {
        paddingHorizontal: SPACING.m,
        paddingVertical: SPACING.m,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        backgroundColor: COLORS.background,
    },
    actionButton: {
        paddingVertical: SPACING.m,
        borderRadius: SPACING.m,
        alignItems: 'center',
    },
    saveButton: {
        backgroundColor: COLORS.primary,
    },
    saveButtonText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '600',
    },
    retrySection: {
        marginTop: SPACING.m,
        alignItems: 'center',
        gap: SPACING.s,
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.s,
        paddingVertical: SPACING.s,
        paddingHorizontal: SPACING.m,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: COLORS.primary,
        borderRadius: SPACING.s,
    },
    retryButtonText: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: '600',
    },
    retrySubtext: {
        fontSize: 12,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    // Xray Images styles
    xrayImagesSection: {
        marginTop: SPACING.l,
    },
    xrayImagesHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.m,
    },
    xrayImagesLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    addImageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        paddingHorizontal: SPACING.s,
        paddingVertical: SPACING.xs,
        backgroundColor: COLORS.primary + '15',
        borderRadius: SPACING.s,
    },
    addImageText: {
        color: COLORS.primary,
        fontWeight: '600',
        fontSize: 14,
    },
    xrayImagesScroll: {
        flexDirection: 'row',
    },
    xrayImageContainer: {
        width: 100,
        height: 100,
        marginRight: SPACING.m,
        position: 'relative',
        borderRadius: SPACING.m,
        overflow: 'hidden',
    },
    xrayImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    xrayDeleteButton: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: 'rgba(239, 68, 68, 0.9)',
        padding: 4,
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    mainImageLabel: {
        position: 'absolute',
        top: 4,
        left: 4,
        backgroundColor: COLORS.primary,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    mainImageText: {
        color: COLORS.white,
        fontSize: 10,
        fontWeight: 'bold',
    },
});

export default AWBModal;