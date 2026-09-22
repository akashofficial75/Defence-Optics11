import React, { useState, useRef } from 'react';
import { X, Check, Copy, MessageCircle, Truck, CreditCard, ShieldCheck, ArrowRight, ExternalLink, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { CartItem, PaymentMethod, Order, DeliveryLocation } from '../types';
import { STORE_CONTACTS, buildWhatsAppLink } from '../data/initialData';
import { createOrder } from '../lib/dataStore';
import { useSiteSettings } from '../lib/useSiteSettings';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems?: CartItem[];
  onOrderSuccess?: (order: Order) => void;
  onOrderComplete?: (order: Order) => void;
  onContinueShopping?: () => void;
  appliedPromo?: { code: string; discount_percentage: number };
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cartItems = [],
  onOrderSuccess,
  onOrderComplete,
  onContinueShopping,
  appliedPromo
}) => {
  const { settings } = useSiteSettings();

  const safeItems = cartItems || [];

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState<DeliveryLocation>('inside_dhaka');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [transactionId, setTransactionId] = useState('');
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [validationError, setValidationError] = useState('');

  if (!isOpen) return null;

  const subtotal = safeItems.reduce((acc, item) => {
    if (!item?.product) return acc;
    const price = item.product.discount_price || item.product.price || 0;
    return acc + price * (item.quantity || 1);
  }, 0);

  const discountAmount = appliedPromo
    ? Math.round((subtotal * appliedPromo.discount_percentage) / 100)
    : 0;

  const deliveryChargeInside = Number(settings.delivery_charge_inside_dhaka) || 100;
  const deliveryChargeOutside = Number(settings.delivery_charge_outside_dhaka) || 130;
  const deliveryCharge = deliveryLocation === 'inside_dhaka' ? deliveryChargeInside : deliveryChargeOutside;
  const total = Math.max(0, subtotal - discountAmount + deliveryCharge);

  const handleCopyNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedNumber(num);
    setTimeout(() => setCopiedNumber(null), 2000);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current || isSubmitting) {
      return;
    }
    setValidationError('');

    if (!customerName.trim()) {
      setValidationError('Please enter your full name');
      return;
    }
    if (!customerPhone.trim() || customerPhone.trim().length < 10) {
      setValidationError('Please enter a valid phone number for delivery confirmation');
      return;
    }
    if (!customerAddress.trim()) {
      setValidationError('Please enter your complete delivery address');
      return;
    }

    if ((paymentMethod === 'bkash' || paymentMethod === 'nagad') && !transactionId.trim()) {
      setValidationError(`Please enter the ${paymentMethod.toUpperCase()} Transaction ID (TrxID) after sending money.`);
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const orderData = {
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_address: customerAddress.trim(),
        delivery_location: deliveryLocation,
        delivery_charge: deliveryCharge,
        payment_method: paymentMethod,
        transaction_id: (paymentMethod === 'bkash' || paymentMethod === 'nagad') ? transactionId.trim() : null,
        status: 'pending' as const,
        subtotal,
        total,
        notes: notes.trim() || undefined,
        items: safeItems.map((item) => ({
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.product.discount_price || item.product.price,
          image_url: item.product.images[0]
        }))
      };

      const saved = await createOrder(orderData);
      setConfirmedOrder(saved);
      
      // Notify parent exactly once
      if (onOrderSuccess) {
        onOrderSuccess(saved);
      } else if (onOrderComplete) {
        onOrderComplete(saved);
      }

      // Trigger celebration confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#C89B4A', '#141414', '#E7C98E']
        });
      } catch (err) {
        // Safe fallback
      }

      // If WhatsApp order, prepare wa.me link with complete delivery & price breakdown
      if (paymentMethod === 'whatsapp') {
        const itemsList = safeItems
          .map((i) => `• ${i.product.name} (Qty: ${i.quantity}) - ৳${((i.product.discount_price || i.product.price) * i.quantity).toLocaleString()}`)
          .join('\n');

        const locationText = deliveryLocation === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka';
        const message = `Hello Defence Optics, I would like to place an order!\n\nOrder Ref: ${saved.id}\nCustomer: ${customerName}\nPhone: ${customerPhone}\nDelivery Location: ${locationText}\nAddress: ${customerAddress}\n\n*Items:*\n${itemsList}\n\nSubtotal: ৳${subtotal.toLocaleString()}\nDelivery Charge (${locationText}): ৳${deliveryCharge.toLocaleString()}${discountAmount > 0 ? `\nVoucher Discount: -৳${discountAmount.toLocaleString()}` : ''}\nTotal Amount: ৳${total.toLocaleString()}\n\nNotes: ${notes || 'None'}`;
        const whatsappUrl = buildWhatsAppLink(settings.whatsapp, message);
        window.open(whatsappUrl, '_blank');
      }
    } catch (err: any) {
      setValidationError('Failed to place order. Please try again or reach out on WhatsApp.');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div
        className="relative bg-[#F5F1EA] w-full max-w-3xl shadow-2xl border border-[#DCD3C4] overflow-hidden my-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="bg-[#141414] text-white p-5 sm:p-6 flex items-center justify-between border-b border-[#2A2A2A]">
          <div>
            <span className="text-[10px] text-[#C89B4A] uppercase tracking-[0.2em] font-semibold">
              SECURE CHECKOUT
            </span>
            <h2 className="font-serif text-xl sm:text-2xl font-bold uppercase tracking-wide">
              {confirmedOrder ? 'Order Confirmed' : 'Complete Your Purchase'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#A8A196] hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {confirmedOrder ? (
          /* Order Confirmation Screen */
          <div className="p-6 sm:p-10 text-center space-y-6">
            <div className="w-16 h-16 bg-[#C89B4A]/15 border-2 border-[#C89B4A] text-[#141414] rounded-full flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-[#A87D33] stroke-[2.5]" />
            </div>

              <div>
                <span className="text-xs uppercase tracking-[0.2em] font-bold text-[#A87D33]">
                  Thank You for Choosing Defence Optics
                </span>
                <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#141414] mt-1 mb-2">
                  Order #{confirmedOrder.id} Placed
                </h3>
                <div className="text-xs text-[#59554E] max-w-md mx-auto space-y-1.5 bg-white border border-[#E3DBD0] p-3.5 my-2">
                  <div className="flex justify-between">
                    <span>Products Subtotal:</span>
                    <strong className="text-[#141414]">৳{(confirmedOrder.subtotal ?? (confirmedOrder.total - (confirmedOrder.delivery_charge || 0))).toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Charge ({confirmedOrder.delivery_location === 'outside_dhaka' ? 'Outside Dhaka' : 'Inside Dhaka'}):</span>
                    <strong className="text-[#141414]">৳{(confirmedOrder.delivery_charge || 0).toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between border-t border-[#E8E1D5] pt-1.5 text-sm">
                    <span className="font-bold text-[#141414]">Total Amount:</span>
                    <strong className="font-serif font-bold text-[#141414]">৳{confirmedOrder.total.toLocaleString()}</strong>
                  </div>
                </div>
              </div>

            {/* Dynamic Next Steps based on Chosen Payment Method */}
            <div className="bg-white border border-[#E3DBD0] p-6 text-left max-w-lg mx-auto shadow-xs">
              <h4 className="font-serif font-bold text-sm text-[#141414] uppercase tracking-wider mb-2 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#C89B4A]" /> What Happens Next:
              </h4>

              {confirmedOrder.payment_method === 'cod' && (
                <div className="text-xs text-[#59554E] space-y-2">
                  <p>
                    ✓ <strong>Phone Verification:</strong> Our dispatch concierge will call <strong>{confirmedOrder.customer_phone}</strong> shortly to confirm your optical specs and delivery slot.
                  </p>
                  <p>
                    ✓ <strong>Payment on Arrival:</strong> You will pay <strong>৳{confirmedOrder.total.toLocaleString()}</strong> in cash upon parcel delivery.
                  </p>
                </div>
              )}

              {(confirmedOrder.payment_method === 'bkash' || confirmedOrder.payment_method === 'nagad') && (
                <div className="text-xs text-[#59554E] space-y-2">
                  <p>
                    ✓ <strong>Transaction Under Verification:</strong> We received your {confirmedOrder.payment_method.toUpperCase()} TrxID: <code className="bg-[#FAF8F5] px-1.5 py-0.5 border border-[#E2DAD0] font-mono font-bold text-[#141414]">{confirmedOrder.transaction_id}</code>.
                  </p>
                  <p>
                    ✓ Our finance team will verify the payment against our personal account and update your status to <strong>Confirmed</strong> within 15–30 minutes.
                  </p>
                </div>
              )}

              {confirmedOrder.payment_method === 'whatsapp' && (
                <div className="text-xs text-[#59554E] space-y-2">
                  <p>
                    ✓ Your WhatsApp conversation was prepared with our store concierge. If it didn&apos;t open automatically, you can tap below:
                  </p>
                  <a
                    href={buildWhatsAppLink(settings.whatsapp, `Hello Defence Optics, following up on Order #${confirmedOrder.id}`)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-emerald-800 font-bold hover:underline"
                  >
                    Open WhatsApp Chat with Order #{confirmedOrder.id} <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            <div className="pt-4 flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={() => {
                  onClose();
                  if (onContinueShopping) onContinueShopping();
                }}
                className="px-8 py-3 bg-[#141414] text-white text-xs uppercase tracking-wider font-semibold hover:bg-[#C89B4A] hover:text-[#141414] transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        ) : (
          /* Checkout Form */
          <form onSubmit={handleSubmitOrder} className="p-6 sm:p-8 space-y-6 max-h-[80vh] overflow-y-auto">
            {validationError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                {validationError}
              </div>
            )}

            {/* 1. Customer Information */}
            <div className="space-y-4">
              <h3 className="font-serif text-base font-bold text-[#141414] uppercase tracking-wider flex items-center gap-2 border-b border-[#E3DBD0] pb-2">
                <span className="w-5 h-5 bg-[#141414] text-white text-xs flex items-center justify-center font-sans">
                  1
                </span>
                Customer & Delivery Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-[#4A453D] font-semibold uppercase tracking-wider mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Your Full Name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-[#D5CEC2] focus:border-[#C89B4A] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[#4A453D] font-semibold uppercase tracking-wider mb-1">
                    Phone Number (for Courier & Verification) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 017XXXXXXXX"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-[#D5CEC2] focus:border-[#C89B4A] focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[#4A453D] font-semibold uppercase tracking-wider mb-2">
                    Delivery Location *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label
                      id="checkout-delivery-inside-dhaka"
                      onClick={() => setDeliveryLocation('inside_dhaka')}
                      className={`p-3.5 border rounded-lg cursor-pointer flex items-center justify-between transition-all ${
                        deliveryLocation === 'inside_dhaka'
                          ? 'bg-white border-[#C89B4A] ring-2 ring-[#C89B4A]/20 shadow-xs'
                          : 'bg-[#FAF8F5] border-[#D5CEC2] hover:border-[#141414]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="deliveryLocation"
                          value="inside_dhaka"
                          checked={deliveryLocation === 'inside_dhaka'}
                          onChange={() => setDeliveryLocation('inside_dhaka')}
                          className="accent-[#C89B4A] w-4 h-4 cursor-pointer"
                        />
                        <div>
                          <strong className="block text-xs uppercase tracking-wider text-[#141414]">
                            Inside Dhaka
                          </strong>
                          <span className="text-[11px] text-[#6B655B]">Fast 24-48h City Courier</span>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-xs text-[#141414] bg-[#F3EDE2] px-2.5 py-1 rounded">
                        ৳{deliveryChargeInside}
                      </span>
                    </label>

                    <label
                      id="checkout-delivery-outside-dhaka"
                      onClick={() => setDeliveryLocation('outside_dhaka')}
                      className={`p-3.5 border rounded-lg cursor-pointer flex items-center justify-between transition-all ${
                        deliveryLocation === 'outside_dhaka'
                          ? 'bg-white border-[#C89B4A] ring-2 ring-[#C89B4A]/20 shadow-xs'
                          : 'bg-[#FAF8F5] border-[#D5CEC2] hover:border-[#141414]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="deliveryLocation"
                          value="outside_dhaka"
                          checked={deliveryLocation === 'outside_dhaka'}
                          onChange={() => setDeliveryLocation('outside_dhaka')}
                          className="accent-[#C89B4A] w-4 h-4 cursor-pointer"
                        />
                        <div>
                          <strong className="block text-xs uppercase tracking-wider text-[#141414]">
                            Outside Dhaka
                          </strong>
                          <span className="text-[11px] text-[#6B655B]">All 64 Districts Courier</span>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-xs text-[#141414] bg-[#F3EDE2] px-2.5 py-1 rounded">
                        ৳{deliveryChargeOutside}
                      </span>
                    </label>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[#4A453D] font-semibold uppercase tracking-wider mb-1">
                    Delivery Address (House, Road, Area, City) *
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="e.g. House 12, Road 4, Sector 7, Uttara, Dhaka"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-[#D5CEC2] focus:border-[#C89B4A] focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[#756F64] font-medium uppercase tracking-wider mb-1">
                    Order / Optical Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Special prescription note or call before delivery"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#D5CEC2] focus:border-[#C89B4A] focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* 2. Payment Method Selector */}
            <div className="space-y-4 pt-2">
              <h3 className="font-serif text-base font-bold text-[#141414] uppercase tracking-wider flex items-center gap-2 border-b border-[#E3DBD0] pb-2">
                <span className="w-5 h-5 bg-[#141414] text-white text-xs flex items-center justify-center font-sans">
                  2
                </span>
                Choose Payment Method
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Method 1: Cash on Delivery */}
                <label
                  onClick={() => setPaymentMethod('cod')}
                  className={`p-4 border cursor-pointer flex flex-col justify-between transition-all ${
                    paymentMethod === 'cod'
                      ? 'bg-white border-[#C89B4A] ring-1 ring-[#C89B4A] shadow-xs'
                      : 'bg-white/60 border-[#D8D1C4] hover:border-[#141414]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Truck className="w-5 h-5 text-[#141414]" />
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === 'cod'}
                      onChange={() => setPaymentMethod('cod')}
                      className="accent-[#C89B4A]"
                    />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs uppercase tracking-wider text-[#141414]">
                      Cash on Delivery
                    </h5>
                    <p className="text-[11px] text-[#696359] mt-0.5">
                      Pay upon receiving the package at your doorstep
                    </p>
                  </div>
                </label>

                {/* Method 2: bKash / Nagad Manual */}
                <label
                  onClick={() => setPaymentMethod('bkash')}
                  className={`p-4 border cursor-pointer flex flex-col justify-between transition-all ${
                    paymentMethod === 'bkash' || paymentMethod === 'nagad'
                      ? 'bg-white border-[#C89B4A] ring-1 ring-[#C89B4A] shadow-xs'
                      : 'bg-white/60 border-[#D8D1C4] hover:border-[#141414]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <CreditCard className="w-5 h-5 text-[#C89B4A]" />
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === 'bkash' || paymentMethod === 'nagad'}
                      onChange={() => setPaymentMethod('bkash')}
                      className="accent-[#C89B4A]"
                    />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs uppercase tracking-wider text-[#141414]">
                      bKash / Nagad
                    </h5>
                    <p className="text-[11px] text-[#696359] mt-0.5">
                      Personal &quot;Send Money&quot; & enter TrxID
                    </p>
                  </div>
                </label>

                {/* Method 3: WhatsApp Direct Order */}
                <label
                  onClick={() => setPaymentMethod('whatsapp')}
                  className={`p-4 border cursor-pointer flex flex-col justify-between transition-all ${
                    paymentMethod === 'whatsapp'
                      ? 'bg-white border-[#C89B4A] ring-1 ring-[#C89B4A] shadow-xs'
                      : 'bg-white/60 border-[#D8D1C4] hover:border-[#141414]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <MessageCircle className="w-5 h-5 text-[#25D366]" />
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === 'whatsapp'}
                      onChange={() => setPaymentMethod('whatsapp')}
                      className="accent-[#C89B4A]"
                    />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs uppercase tracking-wider text-[#141414]">
                      WhatsApp Order
                    </h5>
                    <p className="text-[11px] text-[#696359] mt-0.5">
                      Chat directly with concierge to finalize
                    </p>
                  </div>
                </label>
              </div>

              {/* bKash / Nagad Instructions Panel */}
              {(paymentMethod === 'bkash' || paymentMethod === 'nagad') && (
                <div className="bg-white border border-[#C89B4A]/60 p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#F0EBE1] pb-3 flex-wrap gap-2">
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('bkash')}
                        className={`text-xs font-bold uppercase tracking-wider pb-1 transition-colors ${
                          paymentMethod === 'bkash'
                            ? 'text-[#D12053] border-b-2 border-[#D12053]'
                            : 'text-[#827B71]'
                        }`}
                      >
                        bKash Personal
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('nagad')}
                        className={`text-xs font-bold uppercase tracking-wider pb-1 transition-colors ${
                          paymentMethod === 'nagad'
                            ? 'text-[#F7931E] border-b-2 border-[#F7931E]'
                            : 'text-[#827B71]'
                        }`}
                      >
                        Nagad Personal
                      </button>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-[#8C8477] bg-[#FAF8F5] border border-[#E3DBD0] px-2 py-0.5">
                      Send Money (Personal)
                    </span>
                  </div>

                  <div className="text-xs text-[#524D44] space-y-3">
                    <p className="font-medium text-[#141414]">
                      Please use the <strong>&quot;Send Money&quot;</strong> option from your{' '}
                      <strong>{paymentMethod === 'bkash' ? 'bKash' : 'Nagad'}</strong> app for{' '}
                      <strong className="text-[#B8852B]">৳{total.toLocaleString()}</strong>. Both numbers below work for both bKash and Nagad:
                    </p>

                    {/* DUAL NUMBERS SECTION */}
                    <div className="space-y-2.5">
                      {/* Primary Number */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#F7F4EE] border border-[#D5C7B2] p-3 gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] uppercase tracking-wider font-bold text-[#141414]">
                              Send Money to (Primary):
                            </span>
                            <span className="text-[9px] uppercase tracking-wider font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.2">
                              Primary
                            </span>
                          </div>
                          <span className="font-mono text-base font-extrabold text-[#141414] tracking-wide block">
                            {(settings.payment_number_primary || STORE_CONTACTS.paymentNumberPrimary || '01895600794').trim()}
                          </span>
                          <span className="text-[10px] text-[#7A746B] block">
                            Recommended • Works for bKash &amp; Nagad Personal
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleCopyNumber((settings.payment_number_primary || STORE_CONTACTS.paymentNumberPrimary || '01895600794').trim())
                          }
                          className="self-start sm:self-center px-3 py-1.5 bg-[#141414] text-white text-[11px] uppercase tracking-wider font-semibold hover:bg-[#C89B4A] flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
                        >
                          {copiedNumber === (settings.payment_number_primary || STORE_CONTACTS.paymentNumberPrimary || '01895600794').trim() ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" /> Copy Primary
                            </>
                          )}
                        </button>
                      </div>

                      {/* Backup Number */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#FAF8F5] border border-[#E3DBD0] p-3 gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] uppercase tracking-wider font-bold text-[#5A554D]">
                              Backup number (if the above doesn&apos;t work):
                            </span>
                            <span className="text-[9px] uppercase tracking-wider font-bold text-[#7A746B] bg-[#EFEAE1] border border-[#D8D1C4] px-1.5 py-0.2">
                              Backup Option
                            </span>
                          </div>
                          <span className="font-mono text-sm sm:text-base font-bold text-[#38342E] tracking-wide block">
                            {(settings.payment_number_backup || STORE_CONTACTS.paymentNumberBackup || '01327240031').trim()}
                          </span>
                          <span className="text-[10px] text-[#8C8477] block">
                            Fallback if primary reaches limit • Works for bKash &amp; Nagad Personal
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleCopyNumber((settings.payment_number_backup || STORE_CONTACTS.paymentNumberBackup || '01327240031').trim())
                          }
                          className="self-start sm:self-center px-3 py-1.5 bg-white border border-[#D5CEC2] text-[#141414] text-[11px] uppercase tracking-wider font-semibold hover:bg-[#141414] hover:text-white flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
                        >
                          {copiedNumber === (settings.payment_number_backup || STORE_CONTACTS.paymentNumberBackup || '01327240031').trim() ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" /> Copy Backup
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="pt-1">
                      <label className="block text-[#141414] font-bold uppercase tracking-wider mb-1 text-[11px]">
                        Enter Transaction ID (TrxID) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. BK9A72X901 or 7GF82J1"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value.toUpperCase())}
                        className="w-full px-3 py-2.5 bg-white border border-[#D5CEC2] font-mono text-sm uppercase tracking-wider focus:border-[#C89B4A] focus:outline-hidden"
                      />
                      <span className="text-[10px] text-[#7A746B] mt-1 block">
                        Enter the TrxID after sending money to whichever number you used. Admin manually verifies this transaction before packing and dispatching.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* WhatsApp Note */}
              {paymentMethod === 'whatsapp' && (
                <div className="bg-[#FAF8F5] border border-[#25D366]/40 p-4 text-xs text-[#4A453D] space-y-1">
                  <p className="font-bold text-[#141414] flex items-center gap-1.5">
                    <MessageCircle className="w-4 h-4 text-[#25D366]" /> Direct Concierge Assistance:
                  </p>
                  <p>
                    Placing the order will automatically launch WhatsApp with your pre-filled cart summary, delivery address, and price breakdown. You can chat directly with our specialist to confirm your prescription, frame sizes, and delivery date.
                  </p>
                </div>
              )}
            </div>

            {/* Order Price Breakdown */}
            <div className="bg-[#FAF7F2] p-4 sm:p-5 border border-[#E2DAD0] space-y-2 text-xs">
              <div className="flex items-center justify-between text-[#5C564C]">
                <span>Product Subtotal ({safeItems.reduce((s, i) => s + (i?.quantity || 0), 0)} items):</span>
                <span className="font-mono font-bold text-[#141414]">৳{subtotal.toLocaleString()}</span>
              </div>
              {appliedPromo && discountAmount > 0 && (
                <div className="flex items-center justify-between text-emerald-700">
                  <span>Voucher Discount ({appliedPromo.code}):</span>
                  <span className="font-mono font-bold">-৳{discountAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-[#5C564C]">
                <span>
                  Delivery Charge ({deliveryLocation === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'}):
                </span>
                <span className="font-mono font-bold text-[#141414]">৳{deliveryCharge.toLocaleString()}</span>
              </div>
              <div className="border-t border-[#E8E1D5] pt-2 flex items-center justify-between">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-[#736D63] block font-semibold">
                    Total Payable Amount
                  </span>
                  <span className="text-[10px] text-[#8C8477]">
                    Includes product subtotal + {deliveryLocation === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'} delivery
                  </span>
                </div>
                <span className="font-serif text-2xl font-bold text-[#141414]">
                  ৳{total.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Submit Action */}
            <div className="bg-[#EDE7DC] p-4 sm:p-5 border border-[#DCD3C4] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-[#5C564C]">
                <span>Payment: <strong className="uppercase font-mono text-[#141414]">{paymentMethod}</strong> &bull; Total: <strong className="font-serif text-[#141414]">৳{total.toLocaleString()}</strong></span>
              </div>

              <button
                type="submit"
                id="checkout-confirm-order-btn"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-8 py-3.5 bg-[#141414] text-white text-xs sm:text-sm uppercase tracking-[0.14em] font-semibold hover:bg-[#C89B4A] hover:text-[#141414] transition-all flex items-center justify-center gap-2 group shadow-sm disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#C89B4A]" />
                    <span>Placing order...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Place Order</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
