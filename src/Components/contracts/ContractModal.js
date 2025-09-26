// src/components/contracts/ContractModal.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Button, Form, Alert, Row, Col, Badge } from "react-bootstrap";
import { serverTimestamp, doc, updateDoc } from "firebase/firestore";
import db from "../../api/firestore/firestore";
import SignaturePad from "./SignaturePad";
import { buildContractHtml } from "../../utils/contracts";

const isAdminMode = (mode) => mode === "admin";
const ADMIN_DISPLAY_NAME = "Opu Rahman";

const fmtWhen = (t) => {
  if (!t) return "";
  if (typeof t === "number") return new Date(t).toLocaleString();
  if (t?.seconds) return new Date(t.seconds * 1000).toLocaleString();
  try {
    return new Date(t).toLocaleString();
  } catch {
    return String(t);
  }
};

export default function ContractModal({
  show,
  onHide,
  inquiry,
  contract,
  mode = "client",
}) {
  const sigRef = useRef(null);

  // Admin can edit only when creating a NEW contract
  const canEditTemplate = isAdminMode(mode) && !contract;

  // Template fields
  const [title, setTitle] = useState(
    contract?.title || "Event Services Agreement"
  );
  const [html, setHtml] = useState(
    contract?.html || buildContractHtml(inquiry ?? {})
  );

  // Reset template whenever the modal opens for a different contract/inquiry
  useEffect(() => {
    if (!show) return;
    setTitle(contract?.title || "Event Services Agreement");
    setHtml(contract?.html || buildContractHtml(inquiry ?? {}));
  }, [show, inquiry?.id, contract?.id]);

  // Signing flow
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const contracts = Array.isArray(inquiry?.contracts) ? inquiry.contracts : [];
  const clientDisplayName = inquiry?.name || "Client";

  const header = useMemo(() => {
    const who = isAdminMode(mode) ? "Admin" : "Client";
    return contract ? `Contract: ${contract.title}` : `New Contract, ${who}`;
  }, [contract, mode]);

  const handleClose = (changed = false) => onHide?.(changed);

  // ---------- Firestore ops ----------
  const saveNew = async () => {
    if (!inquiry?.id) throw new Error("Missing inquiry id");
    const id = crypto.randomUUID?.() || String(Date.now());
    const next = [
      ...contracts,
      {
        id,
        title: title || "Event Services Agreement",
        html,
        createdAt: Date.now(),
        createdBy: "admin",
        adminSignedAt: null,
        adminSignature: null,
        clientSignedAt: null,
        clientSignature: null,
      },
    ];
    await updateDoc(doc(db, "inquiries", inquiry.id), {
      contracts: next,
      updatedAt: serverTimestamp(),
    });
  };

  const signAndSave = async () => {
    if (!inquiry?.id) throw new Error("Missing inquiry id");
    if (!contract?.id) throw new Error("Missing contract id");

    if (!agree) {
      setError("Please confirm you have read and agree.");
      return;
    }
    const dataUrl = sigRef.current?.getDataUrl?.();
    if (!dataUrl) {
      setError("Please add your signature.");
      return;
    }
    const now = Date.now();

    const next = contracts.map((c) => {
      if (c.id !== contract.id) return c;
      return isAdminMode(mode)
        ? { ...c, adminSignature: dataUrl, adminSignedAt: now }
        : { ...c, clientSignature: dataUrl, clientSignedAt: now };
    });

    await updateDoc(doc(db, "inquiries", inquiry.id), {
      contracts: next,
      updatedAt: serverTimestamp(),
    });
  };

  // Admin can remove ONLY their own signature (clients cannot remove theirs)
  const removeSignature = async () => {
    if (!inquiry?.id || !contract?.id || !isAdminMode(mode)) return;
    const next = contracts.map((c) =>
      c.id !== contract.id
        ? c
        : { ...c, adminSignature: null, adminSignedAt: null }
    );
    await updateDoc(doc(db, "inquiries", inquiry.id), {
      contracts: next,
      updatedAt: serverTimestamp(),
    });
  };

  // Primary CTA (create or sign)
  const handlePrimary = async () => {
    setBusy(true);
    setError("");
    try {
      if (!contract) {
        await saveNew();
      } else {
        await signAndSave();
      }
      handleClose(true);
    } catch (e) {
      setError(e?.message || "Failed to save.");
    } finally {
      setBusy(false);
    }
  };

  // ---------- Download/Print (no extra deps) ----------
  const getSigUrl = (sig) =>
    typeof sig === "string" ? sig : sig?.dataUrl || sig?.url || null;
  const clientSigUrl = getSigUrl(contract?.clientSignature);
  const adminSigUrl = getSigUrl(contract?.adminSignature);

  const buildPrintableHtml = () => {
    const bodyHtml = contract?.html || html || "";
    const sigBlocks = `
      <h4 style="margin:24px 0 12px 0;">Signatures</h4>
      <div style="display:flex; gap:16px; flex-wrap:wrap;">
        ${
          clientSigUrl
            ? `<div style="flex:1 1 300px; border:1px solid #ddd; border-radius:8px; padding:12px;">
                 <div style="margin-bottom:6px;">
                  <span style="display:inline-block; background:#198754; color:#fff; padding:4px 8px; border-radius:12px; font-size:12px;">
                    ${clientDisplayName}
                  </span>
                  <span style="color:#666; font-size:12px; margin-left:8px;">
                    ${fmtWhen(contract?.clientSignedAt)}
                  </span>
                 </div>
                 <img src="${clientSigUrl}" alt="${clientDisplayName} signature"
                      style="max-height:140px; width:100%; object-fit:contain;" />
               </div>`
            : ""
        }
        ${
          adminSigUrl
            ? `<div style="flex:1 1 300px; border:1px solid #ddd; border-radius:8px; padding:12px;">
                 <div style="margin-bottom:6px;">
                  <span style="display:inline-block; background:#0d6efd; color:#fff; padding:4px 8px; border-radius:12px; font-size:12px;">
                    ${ADMIN_DISPLAY_NAME}
                  </span>
                  <span style="color:#666; font-size:12px; margin-left:8px;">
                    ${fmtWhen(contract?.adminSignedAt)}
                  </span>
                 </div>
                 <img src="${adminSigUrl}" alt="${ADMIN_DISPLAY_NAME} signature"
                      style="max-height:140px; width:100%; object-fit:contain;" />
               </div>`
            : ""
        }
      </div>`;

    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${(contract?.title || title || "contract")
      .replace(/\s+/g, " ")
      .trim()}</title>
    <style>
      body { font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; color:#111; }
      .container { padding: 16px; }
      .doc { background:#fff; border:1px solid #eee; padding:16px; border-radius:8px; }
      h3 { margin: 0 0 12px 0; }
      @page { margin: 16mm; }
      @media print { .container { padding:0 } }
    </style>
  </head>
  <body>
    <div class="container">
      <h3>${contract?.title || title}</h3>
      <div class="doc">${bodyHtml}</div>
      ${clientSigUrl || adminSigUrl ? sigBlocks : ""}
    </div>
  </body>
</html>`;
  };

  const exportPdf = () => {
    try {
      const htmlString = buildPrintableHtml();
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.srcdoc = htmlString;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        const w = iframe.contentWindow;
        w?.focus();
        setTimeout(() => {
          w?.print();
          setTimeout(() => document.body.removeChild(iframe), 500);
        }, 150);
      };
    } catch (e) {
      console.error("Print failed:", e);
    }
  };

  const adminSigned = Boolean(contract?.adminSignature);
  const clientSigned = Boolean(contract?.clientSignature);

  return (
    <Modal
      show={show}
      onHide={() => handleClose(false)}
      size="xl"
      centered
      fullscreen="md-down"
    >
      <style>{`.contract-body{max-height:72vh; overflow:auto;}`}</style>
      <Modal.Header closeButton>
        <Modal.Title>{header}</Modal.Title>
      </Modal.Header>

      <Modal.Body className="contract-body">
        {/* Read-only body always visible so PDF has content */}
        <div style={{ padding: 8 }}>
          <h3 className="mb-3">{contract?.title || title}</h3>
          <div
            className="p-3 border rounded"
            style={{ background: "#fff" }}
            dangerouslySetInnerHTML={{ __html: contract?.html || html }}
          />

          {(clientSigUrl || adminSigUrl) && (
            <div className="mt-3">
              <h5>Signatures</h5>
              <Row className="g-3">
                {clientSigUrl && (
                  <Col xs={12} md={6}>
                    <div className="border rounded p-2 h-100">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <Badge bg="success">{clientDisplayName}</Badge>
                        {contract?.clientSignedAt && (
                          <span className="small text-muted">
                            Signed: {fmtWhen(contract.clientSignedAt)}
                          </span>
                        )}
                      </div>
                      <img
                        src={clientSigUrl}
                        alt={`${clientDisplayName} signature`}
                        style={{
                          maxHeight: 140,
                          width: "100%",
                          objectFit: "contain",
                        }}
                      />
                    </div>
                  </Col>
                )}

                {adminSigUrl && (
                  <Col xs={12} md={6}>
                    <div className="border rounded p-2 h-100">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <Badge bg="primary">{ADMIN_DISPLAY_NAME}</Badge>
                        {contract?.adminSignedAt && (
                          <span className="small text-muted">
                            Signed: {fmtWhen(contract.adminSignedAt)}
                          </span>
                        )}
                      </div>
                      <img
                        src={adminSigUrl}
                        alt={`${ADMIN_DISPLAY_NAME} signature`}
                        style={{
                          maxHeight: 140,
                          width: "100%",
                          objectFit: "contain",
                        }}
                      />
                    </div>
                  </Col>
                )}
              </Row>
            </div>
          )}
        </div>

        {/* Editing & signing controls */}
        {canEditTemplate ? (
          <>
            <Form.Group className="mb-2 mt-1">
              <Form.Label>Title</Form.Label>
              <Form.Control
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Form.Group>

            <Form.Group>
              <Form.Label>Contract body, HTML</Form.Label>
              <Form.Control
                as="textarea"
                rows={12}
                value={html}
                onChange={(e) => setHtml(e.target.value)}
              />
            </Form.Group>
            <div className="small text-muted mt-1">
              This HTML will be shown to the client in a read-only view, with a
              signature box at the end.
            </div>
          </>
        ) : (
          <>
            {/* Show signature pad only if not yet signed for the current actor */}
            {isAdminMode(mode) ? (
              adminSigned ? null : (
                <>
                  <div className="mb-2">
                    <strong>{ADMIN_DISPLAY_NAME} signature</strong>
                  </div>
                  <SignaturePad ref={sigRef} />
                  <Form.Check
                    className="mt-2"
                    type="checkbox"
                    checked={agree}
                    onChange={(e) => setAgree(e.target.checked)}
                    label="I have read the agreement and I agree"
                  />
                </>
              )
            ) : clientSigned ? null : (
              <>
                <div className="mb-2">
                  <strong>{clientDisplayName} signature</strong>
                </div>
                <SignaturePad ref={sigRef} />
                <Form.Check
                  className="mt-2"
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  label="I have read the agreement and I agree"
                />
              </>
            )}

            {/* Admin-only control to remove admin signature */}
            {isAdminMode(mode) && adminSigned && (
              <div className="mt-2">
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={removeSignature}
                  disabled={busy}
                >
                  Remove {ADMIN_DISPLAY_NAME}&rsquo;s signature
                </Button>
              </div>
            )}
          </>
        )}

        {error ? (
          <Alert className="mt-3" variant="danger">
            {error}
          </Alert>
        ) : null}
      </Modal.Body>

      <Modal.Footer>
        {contract && (
          <Button
            variant="outline-secondary"
            onClick={exportPdf}
            disabled={busy}
          >
            Download PDF
          </Button>
        )}
        <Button
          variant="secondary"
          onClick={() => handleClose(false)}
          disabled={busy}
        >
          Close
        </Button>
        <Button variant="primary" onClick={handlePrimary} disabled={busy}>
          {contract ? "Save signature" : "Create contract"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
