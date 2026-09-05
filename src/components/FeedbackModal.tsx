'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Check, X, MessageSquare, ThumbsUp, ShieldCheck } from 'lucide-react';
import { FeedbackItem, Incident, Mechanic, useSharedState, INITIAL_FEEDBACK } from '@/utils/store';
import { supabase } from '@/utils/supabase';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  incident: Incident | null;
  mechanic: Mechanic | null;
}

const PRESET_TAGS = [
  '⚡ Fast Arrival',
  '🛠️ Expert Repair',
  '💬 Friendly Service',
  '💰 Fair Value',
  '🚗 Safe Towing',
  '🔋 Quick Battery Jump',
];

export default function FeedbackModal({ isOpen, onClose, incident, mechanic }: FeedbackModalProps) {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [selectedTags, setSelectedTags] = useState<string[]>(['⚡ Fast Arrival', '🛠️ Expert Repair']);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const [feedbackList, setFeedbackList] = useSharedState<FeedbackItem[]>('routerescue_feedback', INITIAL_FEEDBACK);

  if (!isOpen || !incident || !mechanic) return null;

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const newFeedback: FeedbackItem = {
      id: `fb-${Date.now()}`,
      incidentId: String(incident.id),
      mechanicId: String(mechanic.id),
      driverName: incident.driverName || 'Motorist',
      driverPhone: incident.driverPhone || '',
      rating: rating,
      tags: selectedTags,
      comment: comment.trim(),
      createdAt: new Date().toISOString(),
    };

    // Update local & shared state instantly
    setFeedbackList((prev) => [newFeedback, ...(prev || [])]);

    // Save to Supabase
    try {
      await supabase.from('feedback').upsert([
        {
          id: newFeedback.id,
          incident_id: newFeedback.incidentId,
          mechanic_id: String(newFeedback.mechanicId),
          driver_name: newFeedback.driverName,
          driver_phone: newFeedback.driverPhone,
          rating: newFeedback.rating,
          tags: newFeedback.tags,
          comment: newFeedback.comment,
          created_at: newFeedback.createdAt,
        },
      ]);
    } catch (err) {
      console.warn('Supabase feedback save note:', err);
    }

    setIsSubmitting(false);
    setIsSubmitted(true);

    setTimeout(() => {
      setIsSubmitted(false);
      onClose();
    }, 1800);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden text-slate-100"
        >
          {/* Top Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>

          {isSubmitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-10 text-center flex flex-col items-center justify-center gap-3"
            >
              <div className="h-16 w-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-3xl">
                <Check className="h-8 w-8 stroke-[3]" />
              </div>
              <h3 className="text-xl font-bold text-slate-100">Thank You for Your Feedback!</h3>
              <p className="text-xs text-slate-400 max-w-xs">
                Your rating helps garage owners improve service quality across Sri Lanka.
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Header */}
              <div className="text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  <ThumbsUp className="h-3.5 w-3.5" />
                  Repair Completed Feedback
                </div>
                <h3 className="text-xl font-bold text-slate-100">Rate Your Service Experience</h3>
                <p className="text-xs text-slate-400 mt-1">
                  How was your experience with <strong className="text-amber-400">{mechanic.businessName || mechanic.name}</strong>?
                </p>
              </div>

              {/* Star Rating Bar */}
              <div className="flex flex-col items-center gap-2 py-2">
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = (hoverRating || rating) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 cursor-pointer transition-transform hover:scale-110 focus:outline-none"
                      >
                        <Star
                          className={`h-8 w-8 ${
                            active
                              ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                              : 'text-slate-700 fill-slate-800'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
                <span className="text-xs font-bold text-amber-400">
                  {rating === 5 && '🌟 Excellent (5/5)'}
                  {rating === 4 && '👍 Very Good (4/5)'}
                  {rating === 3 && '👌 Average (3/5)'}
                  {rating === 2 && '👎 Poor (2/5)'}
                  {rating === 1 && '⚠️ Terrible (1/5)'}
                </span>
              </div>

              {/* Preset Feedback Tags */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">Select Highlights:</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_TAGS.map((tag) => {
                    const selected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`text-xs px-3 py-1.5 rounded-xl border font-medium transition cursor-pointer ${
                          selected
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-sm'
                            : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Text Comment */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
                  Additional Comments (Optional):
                </label>
                <textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Tell us about the mechanic's response time, professionalism, or vehicle diagnosis..."
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 resize-none"
                />
              </div>

              {/* Security Audit Badge */}
              <div className="flex items-center gap-2 text-[10px] text-slate-500 bg-slate-950/40 p-2.5 rounded-xl border border-slate-850">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Your review will be verified and published to the RouteRescue LK performance network.</span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800 transition"
                >
                  Skip
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-xs font-bold text-slate-950 hover:from-amber-400 hover:to-orange-400 transition shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
