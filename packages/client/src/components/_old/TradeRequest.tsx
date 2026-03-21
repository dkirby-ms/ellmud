import { useCallback, useEffect, useRef } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TradeItem {
  id: string;
  name: string;
  tier: string;
  type: string;
}

export interface TradeRequestData {
  id: string;
  traderId: string;
  traderName: string;
  offeredItems: TradeItem[];
  requestedItems: TradeItem[];
  timestamp: number;
}

export interface TradeRequestProps {
  request: TradeRequestData;
  onAccept: (requestId: string) => void;
  onDecline: (requestId: string) => void;
  autoDeclineMs?: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const AUTO_DECLINE_DEFAULT = 30000; // 30 seconds

const TIER_CLASSES: Record<string, string> = {
  scrap: 'trade-item--scrap',
  common: 'trade-item--common',
  sturdy: 'trade-item--sturdy',
  refined: 'trade-item--refined',
  masterwork: 'trade-item--masterwork',
  anomalous: 'trade-item--anomalous',
};

// ─── TradeRequest ────────────────────────────────────────────────────────────

export function TradeRequest({
  request,
  onAccept,
  onDecline,
  autoDeclineMs = AUTO_DECLINE_DEFAULT,
}: TradeRequestProps): React.JSX.Element {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleAccept = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    onAccept(request.id);
  }, [onAccept, request.id]);

  const handleDecline = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    onDecline(request.id);
  }, [onDecline, request.id]);

  // Auto-decline after timeout
  useEffect(() => {
    timerRef.current = setTimeout(() => {
      onDecline(request.id);
    }, autoDeclineMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [request.id, autoDeclineMs, onDecline]);

  return (
    <div className="trade-request" role="dialog" aria-label="Trade request">
      <div className="trade-request__header">
        <span className="trade-request__icon">🤝</span>
        <span className="trade-request__title">Trade Request</span>
      </div>

      <div className="trade-request__body">
        <p className="trade-request__description">
          <span className="trade-request__trader-name">{request.traderName}</span>
          {' wants to trade'}
        </p>

        {request.offeredItems.length > 0 && (
          <div className="trade-request__section">
            <span className="trade-request__section-label">Offering:</span>
            <div className="trade-request__items" role="list">
              {request.offeredItems.map((item) => (
                <div
                  key={item.id}
                  className={`trade-item ${TIER_CLASSES[item.tier] ?? ''}`}
                  role="listitem"
                >
                  <span className="trade-item__name">{item.name}</span>
                  <span className="trade-item__type">{item.type}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {request.requestedItems.length > 0 && (
          <div className="trade-request__section">
            <span className="trade-request__section-label">Wants:</span>
            <div className="trade-request__items" role="list">
              {request.requestedItems.map((item) => (
                <div
                  key={item.id}
                  className={`trade-item ${TIER_CLASSES[item.tier] ?? ''}`}
                  role="listitem"
                >
                  <span className="trade-item__name">{item.name}</span>
                  <span className="trade-item__type">{item.type}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="trade-request__actions">
        <button
          className="trade-request__accept-btn"
          type="button"
          onClick={handleAccept}
        >
          Accept
        </button>
        <button
          className="trade-request__decline-btn"
          type="button"
          onClick={handleDecline}
        >
          Decline
        </button>
      </div>
    </div>
  );
}

// ─── TradeRequestList (container for multiple requests) ──────────────────────

export interface TradeRequestListProps {
  requests: TradeRequestData[];
  onAccept: (requestId: string) => void;
  onDecline: (requestId: string) => void;
}

export function TradeRequestList({
  requests,
  onAccept,
  onDecline,
}: TradeRequestListProps): React.JSX.Element {
  return (
    <div className="trade-request-list">
      <h3 className="trade-request-list__title">Trade Requests</h3>
      {requests.length === 0 && (
        <div className="trade-request-list__empty">No pending requests</div>
      )}
      {requests.map((req) => (
        <TradeRequest
          key={req.id}
          request={req}
          onAccept={onAccept}
          onDecline={onDecline}
        />
      ))}
    </div>
  );
}
