export interface Feature {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface Segment {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
}

export interface Testimonial {
  id: string;
  name: string;
  businessType: string;
  city: string;
  quote: string;
  avatarUrl: string;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  isPopular: boolean;
  ctaText: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}
