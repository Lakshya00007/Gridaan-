'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { X, Plus, Minus, ShoppingBag, Trash2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/store/cart';
import { formatRupees } from '@/lib/utils';
import { FREE_SHIPPING_THRESHOLD } from '@/lib/config';

export default function CartDrawer() {
  const { guest, isOpen, setOpen, remove, setQuantity, getCount, getSubtotal } = useCart();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const total = getSubtotal();
  const remaining = FREE_SHIPPING_THRESHOLD - total;
  const count = getCount();

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-[60]"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full max-w-md bg-white z-[60] shadow-2xl flex flex-col"
            role="dialog"
            aria-label="Shopping bag"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-5 h-5" />
                <h2 className="text-lg font-semibold">Shopping Bag</h2>
                <span className="text-xs font-medium bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full">
                  {count}
                </span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {guest.length > 0 && (
              <div className="px-6 py-3 bg-gold-50">
                {remaining > 0 ? (
                  <div>
                    <p className="text-xs text-neutral-600 mb-1.5">
                      Add {formatRupees(remaining)} more for{' '}
                      <span className="font-semibold text-gold-700">FREE shipping</span>
                    </p>
                    <div className="h-1.5 bg-gold-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((total / FREE_SHIPPING_THRESHOLD) * 100, 100)}%` }}
                        className="h-full bg-gold-500 rounded-full"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gold-700 font-medium text-center">
                    🎉 You&apos;ve unlocked FREE shipping!
                  </p>
                )}
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {guest.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full px-6">
                  <div className="w-20 h-20 rounded-full bg-neutral-50 flex items-center justify-center mb-4">
                    <ShoppingBag className="w-8 h-8 text-neutral-300" />
                  </div>
                  <p className="text-neutral-500 font-medium mb-1">Your bag is empty</p>
                  <p className="text-sm text-neutral-400 mb-6">Discover our beautiful collection</p>
                  <Link
                    href="/shop"
                    onClick={() => setOpen(false)}
                    className="btn-primary text-sm"
                  >
                    Start Shopping
                  </Link>
                </div>
              ) : (
                <div className="px-6 py-4 space-y-4">
                  <AnimatePresence>
                    {guest.map((item) => (
                      <motion.div
                        key={item.product.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 100 }}
                        className="flex gap-4"
                      >
                        <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-neutral-100 flex-shrink-0">
                          <Image
                            src={item.product.images?.[0] || '/placeholder.png'}
                            alt={item.product.name}
                            fill
                            sizes="80px"
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-neutral-900 line-clamp-1">
                            {item.product.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-sm font-semibold">
                              {formatRupees(item.product.price)}
                            </span>
                            {item.product.discount > 0 && (
                              <span className="text-xs text-neutral-400 line-through">
                                {formatRupees(item.product.original_price)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center border border-neutral-200 rounded-full">
                              <button
                                onClick={() => setQuantity(item.product.id, item.quantity - 1)}
                                className="p-1.5 hover:bg-neutral-50 rounded-full transition-colors"
                                aria-label="Decrease"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-medium w-8 text-center">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => setQuantity(item.product.id, item.quantity + 1)}
                                disabled={item.quantity >= item.product.stock_count}
                                className="p-1.5 hover:bg-neutral-50 rounded-full transition-colors disabled:opacity-50"
                                aria-label="Increase"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <button
                              onClick={() => remove(item.product.id)}
                              className="p-1.5 text-neutral-400 hover:text-red-500 transition-colors"
                              aria-label="Remove"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {guest.length > 0 && (
              <div className="border-t border-neutral-100 px-6 py-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600">Subtotal</span>
                  <span className="text-lg font-semibold">{formatRupees(total)}</span>
                </div>
                <p className="text-xs text-neutral-400">
                  Shipping & taxes calculated at checkout
                </p>
                <Link
                  href="/checkout"
                  onClick={() => setOpen(false)}
                  className="w-full btn-primary py-4 text-base font-semibold group inline-flex"
                >
                  Checkout
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <button
                  onClick={() => setOpen(false)}
                  className="w-full text-center text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
                >
                  Continue Shopping
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
