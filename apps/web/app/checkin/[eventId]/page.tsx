'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import jsQR from 'jsqr';
import { checkInApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { RoleId } from '@/lib/types';
import type { CheckInResult } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import Link from 'next/link';

type Mode = 'qr' | 'manual';

function ResultBanner({ result }: { result: CheckInResult }) {
  const isValid = result.status === 'VALID';
  const isUsed = result.status === 'ALREADY_USED';

  return (
    <div
      className={`rounded-lg p-4 text-white font-semibold ${
        isValid
          ? 'bg-green-600'
          : isUsed
            ? 'bg-red-600'
            : 'bg-yellow-600'
      }`}
    >
      {isValid && (
        <>
          <div className="text-xl">VALID ✓</div>
          <div className="text-sm font-normal mt-1">
            {result.attendeeName} — {result.ticketTypeName}
          </div>
        </>
      )}
      {isUsed && (
        <>
          <div className="text-xl">ALREADY USED ✗</div>
          <div className="text-sm font-normal mt-1">
            Checked in at{' '}
            {result.originalScannedAt
              ? new Date(result.originalScannedAt).toLocaleString()
              : '?'}{' '}
            by {result.staffName}
          </div>
          <div className="text-sm font-normal">
            {result.attendeeName} — {result.ticketTypeName}
          </div>
        </>
      )}
      {result.status === 'INVALID' && (
        <div className="text-xl">INVALID TICKET ✗</div>
      )}
      {result.status === 'NOT_FOUND' && (
        <div className="text-xl">TICKET NOT FOUND ✗</div>
      )}
    </div>
  );
}

export default function CheckInPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>('qr');
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);
  const lastCodeRef = useRef<string | null>(null);
  const cooldownRef = useRef(false);
  const scanLoopRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!authLoading && user && user.role?.id !== RoleId.Staff) {
      router.replace('/');
    }
  }, [authLoading, user, router]);

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const handleScanResult = useCallback(
    async (payload: { c: string; s: string }) => {
      if (cooldownRef.current) return;
      cooldownRef.current = true;
      setProcessing(true);
      setError(null);
      try {
        const res = await checkInApi.scan(payload.c, eventId, payload.s);
        setResult(res);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Scan failed');
      } finally {
        setProcessing(false);
        setTimeout(() => {
          cooldownRef.current = false;
          lastCodeRef.current = null;
        }, 3000);
      }
    },
    [eventId],
  );

  const scanLoop = useCallback(() => {
    if (!scanningRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < video.HAVE_ENOUGH_DATA) {
      requestAnimationFrame(() => scanLoopRef.current());
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (code && code.data !== lastCodeRef.current) {
      lastCodeRef.current = code.data;
      try {
        const parsed = JSON.parse(code.data) as { c: string; s: string };
        if (parsed.c && parsed.s) {
          void handleScanResult(parsed);
        }
      } catch {
        // not our QR format, ignore
      }
    }
    requestAnimationFrame(() => scanLoopRef.current());
  }, [handleScanResult]);

  useEffect(() => {
    scanLoopRef.current = scanLoop;
  }, [scanLoop]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      setCameraError(null);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      scanningRef.current = true;
      scanLoop();
    } catch {
      setCameraError('Camera access denied or unavailable.');
    }
  }, [scanLoop]);

  useEffect(() => {
    if (mode === 'qr') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [mode, startCamera, stopCamera]);

  const handleManual = async () => {
    if (!manualCode.trim()) return;
    setProcessing(true);
    setError(null);
    setResult(null);
    try {
      const res = await checkInApi.manual(manualCode.trim(), eventId);
      setResult(res);
      setManualCode('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Check-in failed');
    } finally {
      setProcessing(false);
    }
  };

  if (authLoading) return null;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-lg mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Check-In</h1>
          <Link
            href={`/checkin/${eventId}/logs`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            View Logs
          </Link>
        </div>

        <div className="flex gap-2">
          <Button
            variant={mode === 'qr' ? 'default' : 'outline'}
            onClick={() => setMode('qr')}
            size="sm"
          >
            QR Scanner
          </Button>
          <Button
            variant={mode === 'manual' ? 'default' : 'outline'}
            onClick={() => setMode('manual')}
            size="sm"
          >
            Manual Entry
          </Button>
        </div>

        {result && <ResultBanner result={result} />}
        {error && (
          <div className="rounded-lg bg-destructive/10 text-destructive p-3 text-sm">
            {error}
          </div>
        )}

        {mode === 'qr' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">QR Scanner</CardTitle>
            </CardHeader>
            <CardContent>
              {cameraError ? (
                <div className="text-destructive text-sm mb-2">{cameraError}</div>
              ) : (
                <div className="relative rounded-md overflow-hidden bg-black aspect-video">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  {processing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <span className="text-white text-sm">Processing…</span>
                    </div>
                  )}
                </div>
              )}
              {cameraError && (
                <Button
                  onClick={() => void startCamera()}
                  size="sm"
                  className="mt-2"
                >
                  Retry Camera
                </Button>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Point the camera at an attendee&apos;s QR code. Auto-scans continuously.
              </p>
            </CardContent>
          </Card>
        )}

        {mode === 'manual' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Manual Entry</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void handleManual()}
                placeholder="Enter ticket code (UUID)"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={processing}
              />
              <Button
                onClick={() => void handleManual()}
                disabled={processing || !manualCode.trim()}
                className="w-full"
              >
                {processing ? 'Checking…' : 'Check In'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
