import React from 'react';
import { FlavorProfile } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface FlavorChartProps {
  profile: FlavorProfile;
}

export const FlavorChart: React.FC<FlavorChartProps> = ({ profile }) => {
  const { t } = useLanguage();

  const attributes = [
    { label: t('الحمضية', 'Acidity'), value: profile.acidity },
    { label: t('الحلاوة', 'Sweetness'), value: profile.sweetness },
    { label: t('القوام (البودي)', 'Body'), value: profile.body },
    { label: t('التوازن', 'Balance'), value: profile.balance }
  ];

  return (
    <div className="space-y-2 text-xs">
      {attributes.map(attr => (
        <div key={attr.label} className="space-y-1">
          <div className="flex justify-between text-[#D4C3B5] font-medium text-[11px]">
            <span>{attr.label}</span>
            <span className="text-[#D99B26] font-bold">{attr.value}/5</span>
          </div>

          <div className="w-full bg-[#110E0C] h-2 rounded-full overflow-hidden border border-[#2A221E]">
            <div
              className="bg-gradient-to-r from-[#8C532B] to-[#D99B26] h-full rounded-full transition-all duration-500"
              style={{ width: `${(attr.value / 5) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default FlavorChart;
