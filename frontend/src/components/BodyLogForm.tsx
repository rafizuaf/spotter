import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { database, userBodyLogsCollection } from '../db';
import { syncDatabase } from '../db/sync';
import { v4 as uuid } from 'uuid';

interface BodyLogFormProps {
  userId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface FormData {
  weightKg: string;
  bodyFatPct: string;
  neckCm: string;
  shouldersCm: string;
  chestCm: string;
  waistCm: string;
  hipsCm: string;
  bicepLeftCm: string;
  bicepRightCm: string;
  thighLeftCm: string;
  thighRightCm: string;
  calfLeftCm: string;
  calfRightCm: string;
}

export default function BodyLogForm({ userId, onSuccess, onCancel }: BodyLogFormProps) {
  const [formData, setFormData] = useState<FormData>({
    weightKg: '',
    bodyFatPct: '',
    neckCm: '',
    shouldersCm: '',
    chestCm: '',
    waistCm: '',
    hipsCm: '',
    bicepLeftCm: '',
    bicepRightCm: '',
    thighLeftCm: '',
    thighRightCm: '',
    calfLeftCm: '',
    calfRightCm: '',
  });
  const [saving, setSaving] = useState(false);

  const updateField = (field: keyof FormData, value: string) => {
    // Only allow numbers and decimal point
    const sanitized = value.replace(/[^0-9.]/g, '');
    setFormData((prev) => ({ ...prev, [field]: sanitized }));
  };

  const parseNumber = (value: string): number | undefined => {
    const num = parseFloat(value);
    return isNaN(num) ? undefined : num;
  };

  const handleSave = async () => {
    // Require at least weight
    if (!formData.weightKg.trim()) {
      Alert.alert('Required', 'Please enter your weight');
      return;
    }

    setSaving(true);
    try {
      await database.write(async () => {
        await userBodyLogsCollection.create((log) => {
          log.serverId = uuid();
          log.userId = userId;
          log.loggedAt = new Date();
          log.weightKg = parseNumber(formData.weightKg);
          log.bodyFatPct = parseNumber(formData.bodyFatPct);
          log.neckCm = parseNumber(formData.neckCm);
          log.shouldersCm = parseNumber(formData.shouldersCm);
          log.chestCm = parseNumber(formData.chestCm);
          log.waistCm = parseNumber(formData.waistCm);
          log.hipsCm = parseNumber(formData.hipsCm);
          log.bicepLeftCm = parseNumber(formData.bicepLeftCm);
          log.bicepRightCm = parseNumber(formData.bicepRightCm);
          log.thighLeftCm = parseNumber(formData.thighLeftCm);
          log.thighRightCm = parseNumber(formData.thighRightCm);
          log.calfLeftCm = parseNumber(formData.calfLeftCm);
          log.calfRightCm = parseNumber(formData.calfRightCm);
        });
      });

      await syncDatabase();
      onSuccess?.();
    } catch (error) {
      console.error('Error saving body log:', error);
      Alert.alert('Error', 'Failed to save body log');
    } finally {
      setSaving(false);
    }
  };

  const renderInput = (
    label: string,
    field: keyof FormData,
    unit: string,
    placeholder?: string
  ) => (
    <View style={styles.inputRow}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          value={formData[field]}
          onChangeText={(value) => updateField(field, value)}
          keyboardType="decimal-pad"
          placeholder={placeholder || '0'}
          placeholderTextColor="#64748b"
        />
        <Text style={styles.unit}>{unit}</Text>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Weight & Body Composition</Text>
      {renderInput('Weight', 'weightKg', 'kg', '70')}
      {renderInput('Body Fat', 'bodyFatPct', '%', '15')}

      <Text style={styles.sectionTitle}>Upper Body</Text>
      {renderInput('Neck', 'neckCm', 'cm')}
      {renderInput('Shoulders', 'shouldersCm', 'cm')}
      {renderInput('Chest', 'chestCm', 'cm')}

      <Text style={styles.sectionTitle}>Midsection</Text>
      {renderInput('Waist', 'waistCm', 'cm')}
      {renderInput('Hips', 'hipsCm', 'cm')}

      <Text style={styles.sectionTitle}>Arms</Text>
      {renderInput('Left Bicep', 'bicepLeftCm', 'cm')}
      {renderInput('Right Bicep', 'bicepRightCm', 'cm')}

      <Text style={styles.sectionTitle}>Legs</Text>
      {renderInput('Left Thigh', 'thighLeftCm', 'cm')}
      {renderInput('Right Thigh', 'thighRightCm', 'cm')}
      {renderInput('Left Calf', 'calfLeftCm', 'cm')}
      {renderInput('Right Calf', 'calfRightCm', 'cm')}

      <View style={styles.buttonRow}>
        {onCancel && (
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Save Log</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 16,
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  inputLabel: {
    flex: 1,
    fontSize: 15,
    color: '#fff',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    width: 80,
    height: 40,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingHorizontal: 12,
    color: '#fff',
    fontSize: 16,
    textAlign: 'right',
  },
  unit: {
    width: 30,
    marginLeft: 8,
    fontSize: 14,
    color: '#94a3b8',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    backgroundColor: '#334155',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    height: 48,
    backgroundColor: '#6366f1',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 40,
  },
});
