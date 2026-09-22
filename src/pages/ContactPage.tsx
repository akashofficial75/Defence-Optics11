import React, { useState } from 'react';
import { MapPin, Phone, Mail, Clock, MessageCircle, Send, Check, ExternalLink } from 'lucide-react';
import { STORE_CONTACTS, buildWhatsAppLink } from '../data/initialData';
import { useSiteSettings } from '../lib/useSiteSettings';

export const ContactPage: React.FC = () => {
  const { settings } = useSiteSettings();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Prescription Lens Inquiry');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <section id="contact" className="scroll-mt-24 w-full bg-[#F5F1EA] py-16 sm:py-24 border-b border-[#E5DDCF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="w-6 h-[2px] bg-[#C89B4A]" />
            <span className="text-[11px] uppercase tracking-[0.25em] font-semibold text-[#A87D33]">
              OPTICAL CONCIERGE
            </span>
            <span className="w-6 h-[2px] bg-[#C89B4A]" />
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold uppercase text-[#141414] tracking-tight">
            Contact & Consultation
          </h1>
          <p className="text-sm text-[#5C564D] mt-2">
            Have a question about prescription lenses, frame measurements, or custom optical fitting? Our licensed optometrists are at your service.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* Left Column: Showroom Information & WhatsApp (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-[#E3DBD0] p-6 sm:p-8 space-y-6">
              <h3 className="font-serif text-lg font-bold text-[#141414] uppercase tracking-wider border-b border-[#F0EBE1] pb-3">
                Flagship Showroom
              </h3>

              <ul className="space-y-4 text-xs text-[#524D44]">
                <li className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[#C89B4A] shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-[#141414] text-sm font-serif">Address:</strong>
                    <a
                      href={settings.map_url || STORE_CONTACTS.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[#C89B4A] transition-colors inline-block font-medium"
                    >
                      {settings.showroom || STORE_CONTACTS.showroom}
                    </a>
                    <a
                      href={settings.map_url || STORE_CONTACTS.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 text-[11px] font-semibold text-[#C89B4A] hover:underline inline-flex items-center gap-1 uppercase tracking-wider"
                    >
                      <span>Get Directions on Google Maps</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-[#C89B4A] shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-[#141414] text-sm font-serif">Telephone:</strong>
                    <a href={`tel:${settings.phone || STORE_CONTACTS.phone}`} className="hover:text-[#C89B4A] transition-colors">
                      {settings.phone || STORE_CONTACTS.phone}
                    </a>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-[#C89B4A] shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-[#141414] text-sm font-serif">Concierge Email:</strong>
                    <a href={`mailto:${settings.email || STORE_CONTACTS.email}`} className="hover:text-[#C89B4A] transition-colors">
                      {settings.email || STORE_CONTACTS.email}
                    </a>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-[#C89B4A] shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-[#141414] text-sm font-serif">Operating Hours:</strong>
                    <span>{settings.hours || STORE_CONTACTS.hours}</span>
                  </div>
                </li>
              </ul>

              {/* Direct WhatsApp Callout */}
              <div className="pt-4 border-t border-[#F0EBE1]">
                <a
                  href={buildWhatsAppLink(settings.whatsapp, 'Hello Defence Optics Concierge, I would like to schedule a consultation.')}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3.5 bg-[#141414] text-white text-xs uppercase tracking-[0.14em] font-semibold hover:bg-[#25D366] hover:text-white transition-colors flex items-center justify-center gap-2 group"
                >
                  <MessageCircle className="w-4 h-4 text-[#25D366] group-hover:text-white transition-colors" />
                  <span>Instant WhatsApp Concierge ({settings.whatsapp})</span>
                </a>
              </div>
            </div>


            {/* Quick Prescriptions Note */}
            <div className="bg-[#EDE7DC] border border-[#DDD5C7] p-5 text-xs text-[#524D44] space-y-1">
              <strong className="block text-[#141414] uppercase font-bold text-[11px]">
                Uploading Your Prescription?
              </strong>
              <p>
                You can send your doctor&apos;s prescription slip or pupillary distance (PD) measurements directly over WhatsApp for verification before we assemble your lenses.
              </p>
            </div>
          </div>

          {/* Right Column: Contact Inquiry Form (7 cols) */}
          <div className="lg:col-span-7 bg-white border border-[#E3DBD0] p-6 sm:p-8">
            <h3 className="font-serif text-lg font-bold text-[#141414] uppercase tracking-wider mb-2">
              Send an Optical Inquiry
            </h3>
            <p className="text-xs text-[#6B655B] mb-6">
              Fill out the form below. We typically respond within 2 business hours.
            </p>

            {submitted ? (
              <div className="p-8 bg-[#FAF8F5] border border-[#E3DBD0] text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#2E7D32]/10 text-[#2E7D32] flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6 stroke-[2.5]" />
                </div>
                <h4 className="font-serif text-xl font-bold text-[#141414]">
                  Inquiry Received
                </h4>
                <p className="text-xs text-[#5C564D] max-w-sm mx-auto">
                  Thank you, <strong>{name}</strong>. Our optometrist concierge team will review your inquiry and contact you via {phone || email}.
                </p>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setMessage('');
                  }}
                  className="mt-4 px-5 py-2 bg-[#141414] text-white text-xs uppercase tracking-wider font-semibold hover:bg-[#C89B4A]"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#47423B] font-semibold uppercase tracking-wider mb-1">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Shakib Al Hasan"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#FAF8F5] border border-[#D5CEC2] focus:border-[#C89B4A] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[#47423B] font-semibold uppercase tracking-wider mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="017XXXXXXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#FAF8F5] border border-[#D5CEC2] focus:border-[#C89B4A] focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#47423B] font-semibold uppercase tracking-wider mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="you@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#FAF8F5] border border-[#D5CEC2] focus:border-[#C89B4A] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[#47423B] font-semibold uppercase tracking-wider mb-1">
                      Subject
                    </label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#FAF8F5] border border-[#D5CEC2] focus:border-[#C89B4A] focus:outline-hidden"
                    >
                      <option value="Prescription Lens Inquiry">Prescription Lens Inquiry</option>
                      <option value="Frame Size & Fitting">Frame Size & Fitting</option>
                      <option value="Order Status & Delivery">Order Status & Delivery</option>
                      <option value="Wholesale or Showroom Appointment">Showroom Appointment</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[#47423B] font-semibold uppercase tracking-wider mb-1">
                    Your Message / Prescription Details *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Tell us what you're looking for or paste your spherical / cylindrical lens values..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#FAF8F5] border border-[#D5CEC2] focus:border-[#C89B4A] focus:outline-hidden"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-[#141414] text-white text-xs uppercase tracking-[0.14em] font-semibold hover:bg-[#C89B4A] hover:text-[#141414] transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Message to Concierge</span>
                </button>
              </form>
            )}
          </div>

        </div>
      </div>
    </section>
  );
};
