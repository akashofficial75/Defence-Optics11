import React, { useState } from 'react';
import { Mail, ArrowRight, Check } from 'lucide-react';

export const Newsletter: React.FC = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;
    setSubscribed(true);
  };

  return (
    <section className="w-full bg-[#141414] text-white py-14 sm:py-16 border-t border-[#262626]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <span className="text-[11px] uppercase tracking-[0.25em] font-semibold text-[#C89B4A]">
          THE VISIONARY CIRCLE
        </span>
        <h2 className="font-serif text-3xl sm:text-4xl font-bold uppercase tracking-wide mt-2 mb-3">
          Receive 10% Off Your First Order
        </h2>
        <p className="text-sm text-[#A8A196] max-w-lg mx-auto mb-8">
          Subscribe for privileged access to seasonal private collections, bespoke frame releases, and optical health insights.
        </p>

        {subscribed ? (
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-[#C89B4A] text-[#141414] font-bold text-xs uppercase tracking-wider">
            <Check className="w-4 h-4 stroke-[3]" /> Welcome to the Circle. Use code: <strong>DEFENCE10</strong>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row max-w-md mx-auto gap-2.5">
            <div className="relative flex-1">
              <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-[#857E73]" />
              <input
                type="email"
                required
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[#212121] border border-[#383838] text-white text-xs placeholder:text-[#7A746B] focus:border-[#D4A347] focus:outline-hidden rounded-lg shadow-inner"
              />
            </div>
            <button
              type="submit"
              className="btn-lift px-6 py-3 bg-[#D4A347] text-[#141414] text-xs uppercase tracking-widest font-bold hover:bg-[#F0CF8C] transition-colors flex items-center justify-center gap-2 rounded-lg cursor-pointer shadow-sm"
            >
              <span>Join</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </section>
  );
};
