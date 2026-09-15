import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../constants/ThemeContext';

export default function PdfViewerScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { title = "Research Paper", url } = useLocalSearchParams();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages] = useState(4);
  const [isPdfDarkMode, setIsPdfDarkMode] = useState(false);

  const getPageText = (page) => {
    switch (page) {
      case 1:
        return `INDIAN INSTITUTE OF TECHNOLOGY HYDERABAD\n\nTitle: DEEP LEARNING ARCHITECTURES FOR EFFICIENT IMAGE RECOGNITION\nAuthor: S. Sharma, Dept of Computer Science & Engineering\n\nABSTRACT:\nThis thesis presents novel deep learning neural network structures optimized for low-latency client inference. We develop a pruned Convolutional Neural Network (CNN) framework that achieves state-of-the-art results on ImageNet datasets while reducing computation size by 40% compared to standard ResNet architectures.\n\n1. INTRODUCTION\nIn recent years, deep neural networks have achieved remarkable breakthroughs in computer vision, automated speech translation, and natural language processing. However, deploying these deep models on local edge platforms remains challenging due to constrained hardware memory and battery life.`;
      case 2:
        return `2. PROPOSED METHODOLOGY\n\nWe propose the "CompactNet" layer framework, which separates spatial kernels from channel filters to minimize parameters. Let X be the input tensor and W be the convolutional weights matrix. We minimize the Loss function L under sparseness constraint:\n\nminimize ||W||_0 subject to L(W; X) < epsilon\n\nBy enforcing structural zero-masks during the backward propagation pass, the resulting networks achieve hardware-level inference acceleration without needing specialized custom compilers.`;
      case 3:
        return `3. EXPERIMENTS AND PERFORMANCE METRICS\n\nWe evaluated CompactNet on multiple standard benchmarking suites, including CIFAR-10, CIFAR-100, and standard ImageNet subsets. The training was conducted using Adam optimizer with an initial learning rate of 1e-3, scaled down by 0.1 at epochs 50, 100, and 150.\n\nTable 1. Accuracy vs Parameter Count\n---------------------------------------------\nModel         | Params (M) | Top-1 Accuracy\n---------------------------------------------\nResNet-50     | 25.6       | 76.1%\nMobileNetV2   |  3.4       | 72.0%\nCompactNet    |  2.1       | 74.8% (Proposed)\n---------------------------------------------`;
      case 4:
        return `4. CONCLUSION AND FUTURE WORKS\n\nOur experimental evaluations demonstrate that CompactNet provides an optimal balance between parameter footprint and top-level classification correctness. In future work, we plan to extend this pruning method to Transformer-based architectures, focusing on natural language sequence models.\n\nREFERENCES:\n[1] LeCun, Y. et al. (2015). Deep learning. Nature, 521(7553).\n[2] He, K. et al. (2016). Deep residual learning for image recognition. IEEE CVPR.`;
      default:
        return '';
    }
  };

  const bgStyle = isPdfDarkMode ? '#121212' : '#FFFFFF';
  const textStyle = isPdfDarkMode ? '#E0E0E0' : '#2A2A2A';

  return (
    <View style={[styles.container, { backgroundColor: theme.primary }]}>
      {/* Header */}
      <View style={[styles.headerSafeArea, { backgroundColor: theme.primary, paddingTop: insets?.top || 0 }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
            {title}
          </Text>
          <TouchableOpacity onPress={() => setIsPdfDarkMode(prev => !prev)} style={styles.darkToggle}>
            <MaterialIcons name={isPdfDarkMode ? "wb-sunny" : "brightness-2"} size={22} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* PDF Content Area */}
      <ScrollView 
        style={[styles.pdfPage, { backgroundColor: bgStyle }]}
        contentContainerStyle={styles.pdfContentContainer}
      >
        <Text style={[styles.pdfText, { color: textStyle }]}>
          {getPageText(currentPage)}
        </Text>
      </ScrollView>

      {/* PDF Control Bar */}
      <View style={[styles.controlBar, { backgroundColor: theme.backgroundElement }]}>
        <TouchableOpacity 
          disabled={currentPage === 1} 
          onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          style={[styles.btn, currentPage === 1 && styles.disabledBtn]}
        >
          <MaterialIcons name="chevron-left" size={28} color={currentPage === 1 ? theme.textSecondary : theme.accent} />
        </TouchableOpacity>

        <Text style={[styles.pageLabel, { color: theme.text }]}>
          Page {currentPage} of {totalPages}
        </Text>

        <TouchableOpacity 
          disabled={currentPage === totalPages} 
          onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          style={[styles.btn, currentPage === totalPages && styles.disabledBtn]}
        >
          <MaterialIcons name="chevron-right" size={28} color={currentPage === totalPages ? theme.textSecondary : theme.accent} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerSafeArea: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
    marginHorizontal: 12,
  },
  darkToggle: {
    padding: 8,
  },
  pdfPage: {
    flex: 1,
    margin: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  pdfContentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  pdfText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'monospace',
  },
  controlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    boxShadow: "0px 4px 12px rgba(0,0,0,0.05)",
    elevation: 3,
  },
  btn: {
    padding: 6,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  pageLabel: {
    fontSize: 13,
    fontWeight: 'bold',
  },
});
