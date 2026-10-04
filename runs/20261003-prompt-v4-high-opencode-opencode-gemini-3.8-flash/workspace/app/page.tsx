'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Customizer } from '@/components/Customizer';
import { BrandStory } from '@/components/BrandStory';
import { Footer } from '@/components/Footer';
import { OrderTrackerModal } from '@/components/OrderTrackerModal';

export default function HomePage() {
  const [isTrackerOpen, setIsTrackerOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[#07090e] stars-bg">
      <Navbar onOpenTracker={() => setIsTrackerOpen(true)} />
      <main className="flex-1">
        <Customizer />
        <BrandStory />
      </main>
      <Footer />
      <OrderTrackerModal
        isOpen={isTrackerOpen}
        onClose={() => setIsTrackerOpen(false)}
      />
    </div>
  );
}
