'use client';
import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface DrawerProps {
  supplierId: string | null;
  open: boolean;
  onClose: () => void;
  context?: { productTitle?: string; opportunityId?: string };
}

const CHANNEL_ICONS: Record<string, string> = {
  email: '✉', whatsapp: '💬', sms: '📱', portal: '🌐',
};

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} className={`w-3.5 h-3.5 ${i <= Math.round(rating) ? 'text-amber-400' : 'text-gray-200'}`}
          fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all shrink-0">
      {copied ? '✓' : 'Copy'}
    </button>
  );
}

function MapEmbed({ lat, lon, city, address }: { lat: number | null; lon: number | null; city: string; address?: string }) {
  const [view, setView] = useState<'map' | 'street'>('map');

  const query = lat && lon ? `${lat},${lon}` : encodeURIComponent(`${address || city}, India`);
  const mapSrc   = `https://maps.google.com/maps?q=${query}&z=17&output=embed`;
  const svSrc    = `https://maps.google.com/maps?q=${query}&layer=c&cbll=${lat ?? 0},${lon ?? 0}&output=embed`;
  const gmUrl    = `https://www.google.com/maps/search/?api=1&query=${query}`;
  const svUrl    = `https://maps.google.com/maps?q=${query}&layer=c`;
  const satUrl   = `https://maps.google.com/maps?q=${query}&t=k`;

  return (
    <div className="space-y-1.5">
      {/* View toggle */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
        {(['map', 'street'] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`flex-1 text-[11px] font-semibold py-1 rounded-md transition-all capitalize ${view === v ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}>
            {v === 'map' ? '🗺 Map' : '🚶 Street View'}
          </button>
        ))}
      </div>

      {/* Embedded map — switches between map and street view */}
      <iframe
        key={view}
        src={view === 'map' ? mapSrc : svSrc}
        className="w-full rounded-xl border border-gray-100"
        style={{ height: 200 }}
        title={view === 'map' ? `Map of ${city}` : `Street View of ${city}`}
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
      />

      {/* Action buttons */}
      <div className="flex gap-1.5">
        <a href={gmUrl} target="_blank" rel="noopener noreferrer"
          className="flex-1 text-center text-[11px] font-semibold py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors">
          📍 Open Maps
        </a>
        <a href={svUrl} target="_blank" rel="noopener noreferrer"
          className="flex-1 text-center text-[11px] font-semibold py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors">
          🚶 Street View
        </a>
        <a href={satUrl} target="_blank" rel="noopener noreferrer"
          className="flex-1 text-center text-[11px] font-semibold py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors">
          🛰 Satellite
        </a>
      </div>
    </div>
  );
}

export function SupplierProfileDrawer({ supplierId, open, onClose, context }: DrawerProps) {
  const [rfq, setRfq] = useState<{ subject: string; body: string; whatsappMessage: string } | null>(null);
  const [rfqLoading, setRfqLoading] = useState(false);
  const [activeChannel, setActiveChannel] = useState<string | null>(null);

  const { data: supplier, isLoading, error } = useQuery({
    queryKey: ['supplier-profile', supplierId],
    queryFn: () => api.suppliers.getProfile(supplierId!),
    enabled: open && !!supplierId,
    retry: false,
  });

  const { data: outreach } = useQuery({
    queryKey: ['supplier-outreach', supplierId],
    queryFn: () => api.suppliers.getOutreach(supplierId!),
    enabled: open && !!supplierId,
  });

  const logMutation = useMutation({
    mutationFn: (data: { channel: string; subject?: string; messageBody?: string }) =>
      api.suppliers.logOutreach(supplierId!, { ...data, opportunityId: context?.opportunityId }),
  });

  const generateRfq = useCallback(async () => {
    if (!supplierId) return;
    setRfqLoading(true);
    try {
      const result = await api.suppliers.generateRfq(supplierId);
      setRfq(result);
    } finally {
      setRfqLoading(false);
    }
  }, [supplierId]);

  function openChannel(channel: string) {
    if (!supplier) return;
    const product = context?.productTitle || supplier.product?.title || 'your product';

    let url = '';
    let subject = '';
    let body = '';

    if (channel === 'email') {
      subject = rfq?.subject || `Bulk Purchase Inquiry — ${product}`;
      body = rfq?.body || `Dear ${supplier.supplierName} Team,\n\nI am interested in sourcing ${product} in bulk for export. Please share your best price for 200+ units.\n\nThank you.`;
      url = `mailto:${supplier.contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    } else if (channel === 'whatsapp') {
      const msg = rfq?.whatsappMessage || `Hi ${supplier.supplierName}! Interested in bulk purchase of ${product}. Can you share best price for 200+ units? Thanks!`;
      const phone = supplier.contactWhatsapp?.replace(/\D/g, '') || '';
      url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
      body = msg;
    } else if (channel === 'sms') {
      const msg = `Hi ${supplier.supplierName}, interested in bulk sourcing of ${product}. Please call/WhatsApp to discuss pricing.`;
      const phone = supplier.contactPhone?.replace(/\D/g, '') || '';
      url = `sms:${phone}?body=${encodeURIComponent(msg)}`;
      body = msg;
    } else if (channel === 'portal') {
      url = supplier.sourceUrl || '#';
    }

    if (url && url !== '#') {
      window.open(url, '_blank');
      logMutation.mutate({ channel, subject, messageBody: body });
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="relative ml-auto w-full max-w-lg bg-white shadow-2xl flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-gray-600">Supplier Profile</span>
          <div className="w-7" />
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin text-3xl text-green-600">&#x27F3;</div>
          </div>
        ) : !supplier ? (
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="text-center">
              <div className="text-3xl mb-3">
                {(error as any)?.message?.includes('ailed') ? '⚠️' : '🔍'}
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">
                {(error as any)?.message?.includes('ailed') ? 'Could not load supplier' : 'Supplier not found'}
              </p>
              <p className="text-xs text-gray-400 leading-snug">
                {(error as any)?.message?.includes('ailed')
                  ? 'There was a problem reaching the server. Try closing and reopening.'
                  : 'This supplier may have been removed or the link is invalid.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Identity */}
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <h2 className="font-bold text-gray-900 text-lg leading-tight">{supplier.supplierName}</h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs uppercase bg-gray-100 px-2 py-0.5 rounded font-mono text-gray-600">
                      {supplier.source}
                    </span>
                    {supplier.verifiedBadge && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                        ✓ Verified
                      </span>
                    )}
                    <span className="text-xs text-gray-500">{supplier.companyType}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 justify-end">
                    <StarRating rating={Number(supplier.rating) || 4} />
                    <span className="text-sm font-semibold text-gray-800">{Number(supplier.rating || 4).toFixed(1)}</span>
                  </div>
                  <div className="text-xs text-gray-400">{supplier.reviewCount} reviews</div>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-center gap-1.5 text-sm text-gray-600 mt-2">
                <span>📍</span>
                <span>{[supplier.city, supplier.state, supplier.country].filter(Boolean).join(', ')}</span>
              </div>

              {/* Description */}
              {supplier.description && (
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">{supplier.description}</p>
              )}
            </div>

            {/* Map */}
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Location</div>
              <MapEmbed
                lat={supplier.latitude ?? null}
                lon={supplier.longitude ?? null}
                city={supplier.city || 'India'}
                address={supplier.address || supplier.city || 'India'}
              />
            </div>

            {/* Certifications */}
            {supplier.certifications?.length > 0 && (
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Certifications</div>
                <div className="flex flex-wrap gap-2">
                  {supplier.certifications.map((cert: string) => (
                    <span key={cert} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full font-medium">
                      {cert}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Company Info */}
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Company Info</div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {supplier.yearEstablished && (
                  <div>
                    <div className="text-xs text-gray-400">Est.</div>
                    <div className="font-medium text-gray-800">{supplier.yearEstablished}</div>
                  </div>
                )}
                {supplier.employeeCount && (
                  <div>
                    <div className="text-xs text-gray-400">Employees</div>
                    <div className="font-medium text-gray-800">{supplier.employeeCount}</div>
                  </div>
                )}
                {supplier.annualTurnover && (
                  <div>
                    <div className="text-xs text-gray-400">Turnover</div>
                    <div className="font-medium text-gray-800">{supplier.annualTurnover}</div>
                  </div>
                )}
                {supplier.moq && (
                  <div>
                    <div className="text-xs text-gray-400">Min Order</div>
                    <div className="font-medium text-gray-800">{supplier.moq} units</div>
                  </div>
                )}
              </div>
            </div>

            {/* Sourcing Details */}
            <div className="px-5 py-4 border-b border-gray-100 bg-green-50/50">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Sourcing Details</div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Unit Cost</div>
                  <div className="font-bold text-gray-900">₹{((Number(supplier.productCostMinor) || 0) / 100).toFixed(0)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">MOQ</div>
                  <div className="font-bold text-gray-900">{supplier.moq}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Lead Time</div>
                  <div className="font-bold text-gray-900">{supplier.leadTimeDays}d</div>
                </div>
              </div>
            </div>

            {/* Contact Channels */}
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Contact & Negotiate</div>
              <div className="grid grid-cols-2 gap-2">
                {supplier.contactEmail && (
                  <button onClick={() => openChannel('email')}
                    className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-all text-sm font-medium text-gray-700">
                    <span className="text-lg">✉</span>
                    <div className="text-left">
                      <div className="text-xs font-semibold">Email</div>
                      <div className="text-xs text-gray-400 truncate max-w-[100px]">{supplier.contactEmail}</div>
                    </div>
                  </button>
                )}
                {supplier.contactWhatsapp && (
                  <button onClick={() => openChannel('whatsapp')}
                    className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-all text-sm font-medium text-gray-700">
                    <span className="text-lg">💬</span>
                    <div className="text-left">
                      <div className="text-xs font-semibold">WhatsApp</div>
                      <div className="text-xs text-gray-400">Send message</div>
                    </div>
                  </button>
                )}
                {supplier.contactPhone && (
                  <button onClick={() => openChannel('sms')}
                    className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-all text-sm font-medium text-gray-700">
                    <span className="text-lg">📱</span>
                    <div className="text-left">
                      <div className="text-xs font-semibold">SMS</div>
                      <div className="text-xs text-gray-400 truncate max-w-[100px]">{supplier.contactPhone}</div>
                    </div>
                  </button>
                )}
                {supplier.sourceUrl && (
                  <button onClick={() => openChannel('portal')}
                    className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-all text-sm font-medium text-gray-700">
                    <span className="text-lg">🌐</span>
                    <div className="text-left">
                      <div className="text-xs font-semibold">Supplier Portal</div>
                      <div className="text-xs text-gray-400">View listing</div>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* AI RFQ Generator */}
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">AI Negotiation Template</div>
                <button onClick={generateRfq} disabled={rfqLoading}
                  className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium">
                  {rfqLoading ? '⟳ Generating…' : rfq ? '↻ Regenerate' : '✨ Generate RFQ'}
                </button>
              </div>

              {rfq ? (
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs font-semibold text-gray-500">Subject</div>
                      <CopyBtn text={rfq.subject} />
                    </div>
                    <div className="text-sm text-gray-800">{rfq.subject}</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs font-semibold text-gray-500">Email Body</div>
                      <div className="flex gap-1">
                        <CopyBtn text={rfq.body} />
                        <button onClick={() => openChannel('email')}
                          className="text-xs px-2 py-1 rounded border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 transition-all">
                          Open Email
                        </button>
                      </div>
                    </div>
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed max-h-48 overflow-y-auto">{rfq.body}</pre>
                  </div>
                  <div className="bg-green-50 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs font-semibold text-gray-500">WhatsApp Message</div>
                      <div className="flex gap-1">
                        <CopyBtn text={rfq.whatsappMessage} />
                        <button onClick={() => openChannel('whatsapp')}
                          className="text-xs px-2 py-1 rounded border border-green-200 bg-green-100 text-green-700 hover:bg-green-200 transition-all">
                          Send
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-700">{rfq.whatsappMessage}</p>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-4 text-center text-sm text-gray-400">
                  Generate an AI-powered negotiation message tailored to this supplier and product.
                </div>
              )}
            </div>

            {/* Outreach History */}
            {outreach && outreach.length > 0 && (
              <div className="px-5 py-4">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Outreach History ({outreach.length})
                </div>
                <div className="space-y-2">
                  {outreach.slice(0, 5).map((o: any) => (
                    <div key={o.id} className="flex items-center gap-3 text-sm p-2 rounded-lg bg-gray-50">
                      <span className="text-base">{CHANNEL_ICONS[o.channel] || '📧'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-700 capitalize">{o.channel}</div>
                        {o.subject && <div className="text-xs text-gray-400 truncate">{o.subject}</div>}
                      </div>
                      <div className="text-xs text-gray-400 shrink-0">
                        {new Date(Number(o.createdAt)).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
