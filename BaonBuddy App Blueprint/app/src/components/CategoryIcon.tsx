import React from 'react';
import { 
  Utensils, 
  Bus, 
  Film, 
  ShoppingBag, 
  Book, 
  Heart, 
  FileText, 
  MoreHorizontal,
  DollarSign
} from 'lucide-react';

interface CategoryIconProps {
  icon: string | undefined | null;
  className?: string;
}

export function CategoryIcon({ icon, className = "w-5 h-5" }: CategoryIconProps) {
  if (!icon) return <DollarSign className={className} />;

  // Map slugs to Lucide icons
  const iconMap: Record<string, React.ReactNode> = {
    'utensils': <Utensils className={className} />,
    'bus': <Bus className={className} />,
    'film': <Film className={className} />,
    'shopping-bag': <ShoppingBag className={className} />,
    'book': <Book className={className} />,
    'heart': <Heart className={className} />,
    'file-invoice': <FileText className={className} />,
    'ellipsis-h': <MoreHorizontal className={className} />,
  };

  const normalizedIcon = icon?.toLowerCase().trim() || '';
  if (iconMap[normalizedIcon]) {
    return iconMap[normalizedIcon];
  }

  // Handle case-insensitive mapping
  for (const [key, value] of Object.entries(iconMap)) {
    if (key.includes(normalizedIcon) || normalizedIcon.includes(key)) {
      return value;
    }
  }

  // If the string starts with a common emoji pattern or is just a single character
  if (normalizedIcon.length <= 4) {
    return <span className="text-xl leading-none">{icon}</span>;
  }

  // Fallback to emoji based on name if possible
  const emojiMap: Record<string, string> = {
    'utensils': '🍴',
    'food': '🍕',
    'transport': '🚌',
    'bus': '🚌',
    'film': '🎬',
    'entertainment': '🎮',
    'shopping': '🛍️',
    'book': '📖',
    'education': '🎓',
    'heart': '❤️',
    'health': '🩺',
    'file': '📄',
    'bills': '💸',
    'other': '📦'
  };

  if (emojiMap[normalizedIcon]) {
    return <span className="text-xl leading-none">{emojiMap[normalizedIcon]}</span>;
  }

  // Default fallback
  return <DollarSign className={className} />;
}
