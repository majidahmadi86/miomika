import {
  UtensilsCrossed, Hand, Briefcase, Users, Home, Car,
  Heart, BookOpen, Music, ShoppingBag, Globe, Smile,
  Coffee, Sun, Moon, MapPin, Phone, Mail, Camera, Dumbbell,
  type LucideIcon,
} from "lucide-react";

export const IMAGE_CATEGORY_MAP: Record<string, LucideIcon> = {
  food: UtensilsCrossed,
  greeting: Hand,
  work: Briefcase,
  business: Briefcase,
  family: Users,
  home: Home,
  house: Home,
  transport: Car,
  travel: Globe,
  health: Heart,
  medical: Heart,
  education: BookOpen,
  academic: BookOpen,
  music: Music,
  shopping: ShoppingBag,
  emotion: Smile,
  feeling: Smile,
  drink: Coffee,
  beverage: Coffee,
  morning: Sun,
  night: Moon,
  location: MapPin,
  place: MapPin,
  communication: Phone,
  phone: Phone,
  email: Mail,
  photo: Camera,
  sport: Dumbbell,
  exercise: Dumbbell,
};

export function getIconForCategory(category: string | null | undefined): LucideIcon | null {
  if (!category) return null;
  const lower = category.toLowerCase();
  for (const [key, icon] of Object.entries(IMAGE_CATEGORY_MAP)) {
    if (lower.includes(key)) return icon;
  }
  return null;
}
