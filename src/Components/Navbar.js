import React, { useEffect, useState, useCallback } from "react";
import Container from "react-bootstrap/Container";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";
import NavDropdown from "react-bootstrap/NavDropdown";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import Offcanvas from "react-bootstrap/Offcanvas";
import { getAuth, onAuthStateChanged } from "@firebase/auth";
import { signOut } from "firebase/auth";
import {
  getDoc,
  doc,
  collection,
  query,
  where,
  onSnapshot,
} from "@firebase/firestore";
import "./Css/components.css";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { PiShoppingCartBold } from "react-icons/pi";
import {
  FileText,
  Home,
  LogIn,
  LogOut,
  Package,
  Settings,
  ShoppingCart,
  UserRound,
  UsersRound,
} from "lucide-react";
import firestore from "../api/firestore/firestore";
import AccountModal from "./AccountModal";

function AppNavbar() {
  const [isAdmin, setIsAdmin] = useState(null);
  const [userData, setUserData] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const [processingCount, setProcessingCount] = useState(0);
  const [adminViewMode, setAdminViewMode] = useState(() => {
    try {
      return localStorage.getItem("adminViewMode") === "customer"
        ? "customer"
        : "admin";
    } catch {
      return "admin";
    }
  });
  const [expanded, setExpanded] = useState(false); // control mobile collapse
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accountMode, setAccountMode] = useState("login");
  const [showAdminTools, setShowAdminTools] = useState(false);

  const auth = getAuth();
  const db = firestore;
  const location = useLocation();
  const navigate = useNavigate();

  const socials = [
    {
      linkToSocial: "https://www.facebook.com/ormusicevents",
      imageSrc: "facebook.png",
    },
    {
      linkToSocial: "https://www.instagram.com/ormusic.events/",
      imageSrc: "instagram.png",
    },
    {
      linkToSocial: "https://www.youtube.com/channel/UCdtFAaHPQxzm-jKlPgKPngQ",
      imageSrc: "youtube.png",
    },
    {
      linkToSocial: "https://www.tiktok.com/@officialopu",
      imageSrc: "tiktok.png",
    },
  ];

  const adminLinks = [
    { to: "/dashboard-admin", label: "Dashboard" },
    { to: "/reports-admin", label: "Reports" },
    { to: "/rental-items-admin", label: "Rental Items" },
    { to: "/music-video-admin", label: "Music Videos" },
    { to: "/dj-mc-admin", label: "Team" },
    { to: "/inquiries-admin", label: "Inquiries", count: processingCount },
    { to: "/eventure-admin", label: "Eventure Admin" },
  ];
  const adminUtilityLinks = [
    { to: "/inquiries", label: "My inquiries" },
    ...adminLinks,
  ];
  const isCustomerView = Boolean(isAdmin) && adminViewMode === "customer";
  const showAdminNavigation = Boolean(isAdmin) && !isCustomerView;

  // close the navbar after navigation on mobile
  const handleNavItemClick = useCallback(() => {
    setExpanded(false);
    setShowAdminTools(false);
  }, []);

  // stable reader for cart count
  const readCartCount = useCallback(() => {
    try {
      const raw = localStorage.getItem("cartItems");
      const arr = raw ? JSON.parse(raw) : [];
      const total = arr.reduce((sum, it) => sum + Number(it.quantity || 0), 0);
      setCartCount((prev) => (prev !== total ? total : prev));
    } catch {
      setCartCount(0);
    }
  }, []);

  // listen once for cart changes
  useEffect(() => {
    readCartCount();
    const onStorage = (e) => {
      if (e.key === "cartItems") readCartCount();
    };
    window.addEventListener("cart:update", readCartCount);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("cart:update", readCartCount);
      window.removeEventListener("storage", onStorage);
    };
  }, [readCartCount]);

  // auth subscription
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUserData((s) => (s !== null ? null : s));
        setIsAdmin((s) => (s !== null ? null : s));
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setUserData((prev) =>
            JSON.stringify(prev) !== JSON.stringify(data) ? data : prev
          );
          const nextAdmin = !!data?.isAdmin;
          setIsAdmin((prev) => (prev !== nextAdmin ? nextAdmin : prev));
        } else {
          const fallbackProfile = {
            name: user.displayName || user.email || "Account",
            email: user.email || "",
            isAdmin: false,
          };
          setUserData((prev) =>
            JSON.stringify(prev) !== JSON.stringify(fallbackProfile)
              ? fallbackProfile
              : prev
          );
          setIsAdmin((s) => (s !== null ? null : s));
        }
      } catch {
        /* ignore */
      }
    });
    return () => unsub();
  }, [auth, db]);

  useEffect(() => {
    const openLogin = () => {
      setAccountMode("login");
      setShowAccountModal(true);
    };
    window.addEventListener("auth:open", openLogin);
    return () => window.removeEventListener("auth:open", openLogin);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("adminViewMode", adminViewMode);
    } catch {
      /* ignore */
    }
  }, [adminViewMode]);

  useEffect(() => {
    if (userData && !isAdmin && adminViewMode !== "admin") {
      setAdminViewMode("admin");
    }
  }, [adminViewMode, isAdmin, userData]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUserData(null);
      setIsAdmin(null);
      setAdminViewMode("admin");
      handleNavItemClick();
    } catch (error) {
      console.error(error);
    }
  };

  const changeAdminViewMode = (mode) => {
    setAdminViewMode(mode);
    setExpanded(false);
    setShowAdminTools(false);
    if (mode === "customer" && location.pathname.includes("-admin")) {
      navigate("/");
    }
  };

  const openAccountLogin = () => {
    handleNavItemClick();
    setAccountMode("login");
    setShowAccountModal(true);
  };

  const isActivePath = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  // subscribe to Processing inquiries for admins
  useEffect(() => {
    if (!isAdmin) {
      setProcessingCount(0);
      return;
    }
    const q = query(
      collection(db, "inquiries"),
      where("status", "==", "Processing")
    );
    const unsub = onSnapshot(
      q,
      (snap) => setProcessingCount(snap.size || 0),
      () => setProcessingCount(0)
    );
    return () => unsub();
  }, [db, isAdmin]);

  return (
    <>
      <Navbar
        bg="primary"
        expand="lg"
        collapseOnSelect
        expanded={expanded}
        onToggle={setExpanded}
      >
        <Container>
          <Navbar.Brand as={Link} to="/" onClick={handleNavItemClick}>
            <img
              src="ormusiclogo.png"
              alt=""
              width="100"
              height="30"
              className="d-inline-block align-top"
            />
          </Navbar.Brand>

          <Navbar.Toggle aria-controls="basic-navbar-nav" />

          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto" onSelect={handleNavItemClick}>
              <Nav.Link
                className="nav-items"
                as={Link}
                to="/"
                onClick={handleNavItemClick}
              >
                Home
              </Nav.Link>
              <Nav.Link
                className="nav-items"
                as={Link}
                to="/DJMC"
                onClick={handleNavItemClick}
              >
                Team
              </Nav.Link>
              <Nav.Link
                className="nav-items"
                as={Link}
                to="/RentalItems"
                onClick={handleNavItemClick}
              >
                Services
              </Nav.Link>

              {userData && !showAdminNavigation ? (
                <Nav.Link
                  className="nav-items"
                  as={Link}
                  to="/inquiries"
                  onClick={handleNavItemClick}
                >
                  My inquiries
                </Nav.Link>
              ) : null}

              <NavDropdown
                title="Media"
                className="nav-items"
                id="media-dropdown"
              >
                <NavDropdown.Item
                  className="nav-items-dropdown"
                  as={Link}
                  to="/MusicVideos"
                  onClick={handleNavItemClick}
                >
                  Music Videos
                </NavDropdown.Item>
              </NavDropdown>

              {showAdminNavigation && (
                <NavDropdown
                  className="nav-items"
                  id="admin-dropdown"
                  title={
                    <span className="d-inline-flex align-items-center">
                      Admin
                      {processingCount > 0 && (
                        <Badge
                          bg="light"
                          text="dark"
                          pill
                          className="ms-2"
                          title="Inquiries in Processing"
                        >
                          {processingCount}
                        </Badge>
                      )}
                    </span>
                }
              >
                  {adminUtilityLinks.map((link) => (
                    <NavDropdown.Item
                      key={link.to}
                      as={Link}
                      to={link.to}
                      onClick={handleNavItemClick}
                    >
                      {link.label}
                      {link.count > 0 ? (
                        <Badge bg="danger" pill className="ms-2">
                          {link.count}
                        </Badge>
                      ) : null}
                    </NavDropdown.Item>
                  ))}
                </NavDropdown>
              )}
            </Nav>

            <Nav
              variant="pills"
              className="align-items-lg-center gap-lg-2"
              onSelect={handleNavItemClick}
            >
              {isAdmin ? (
                <div
                  className="admin-view-toggle"
                  role="group"
                  aria-label="Admin view mode"
                >
                  <button
                    type="button"
                    className={isCustomerView ? "is-active" : ""}
                    onClick={() => changeAdminViewMode("customer")}
                  >
                    Customer
                  </button>
                  <button
                    type="button"
                    className={!isCustomerView ? "is-active" : ""}
                    onClick={() => changeAdminViewMode("admin")}
                  >
                    Admin
                  </button>
                </div>
              ) : null}

              <Nav.Link
                className="mx-3 position-relative"
                as={Link}
                to="/Cart"
                onClick={handleNavItemClick}
              >
                <PiShoppingCartBold style={{ fontSize: "225%" }} />
                {cartCount > 0 && (
                  <Badge
                    bg="danger"
                    pill
                    className="position-absolute top-0 start-100 translate-middle"
                  >
                    {cartCount}
                  </Badge>
                )}
              </Nav.Link>

              {userData ? (
                <NavDropdown
                  align="end"
                  title={
                    <span className="d-inline-flex align-items-center gap-2">
                      <UserRound size={18} />
                      {userData.name || "Account"}
                    </span>
                  }
                  id="account-dropdown"
                  className="nav-items account-menu"
                >
                  <NavDropdown.Header>
                    <div className="fw-semibold">
                      {userData.name || "Account"}
                    </div>
                    <div className="small text-muted">
                      {userData.email || ""}
                    </div>
                  </NavDropdown.Header>
                  <NavDropdown.Divider />
                  <NavDropdown.Item
                    as={Link}
                    to="/inquiries"
                    onClick={handleNavItemClick}
                  >
                    <FileText size={16} className="me-2" />
                    My inquiries
                  </NavDropdown.Item>
                  <NavDropdown.Item onClick={handleLogout}>
                    <LogOut size={16} className="me-2" />
                    Logout
                  </NavDropdown.Item>
                </NavDropdown>
              ) : (
                <Button
                  className="account-button"
                  variant="light"
                  size="sm"
                  onClick={openAccountLogin}
                >
                  <LogIn size={16} />
                  Login
                </Button>
              )}

              {socials.map((s, i) => (
                <a
                  key={i}
                  href={s.linkToSocial}
                  target="_blank"
                  rel="noreferrer"
                  onClick={handleNavItemClick}
                >
                  <img style={{ opacity: ".5" }} alt="" src={s.imageSrc} />
                </a>
              ))}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <nav className="mobile-tabbar" aria-label="Primary mobile navigation">
        <Link
          to="/"
          className={`mobile-tab ${isActivePath("/") ? "is-active" : ""}`}
          onClick={handleNavItemClick}
        >
          <Home size={22} />
          <span>Home</span>
        </Link>
        <Link
          to="/RentalItems"
          className={`mobile-tab ${
            isActivePath("/RentalItems") ? "is-active" : ""
          }`}
          onClick={handleNavItemClick}
        >
          <Package size={22} />
          <span>Services</span>
        </Link>
        <Link
          to="/DJMC"
          className={`mobile-tab ${isActivePath("/DJMC") ? "is-active" : ""}`}
          onClick={handleNavItemClick}
        >
          <UsersRound size={22} />
          <span>Team</span>
        </Link>
        <Link
          to="/Cart"
          className={`mobile-tab mobile-tab-cart ${
            isActivePath("/Cart") ? "is-active" : ""
          }`}
          onClick={handleNavItemClick}
        >
          <span className="mobile-tab-icon">
            <ShoppingCart size={22} />
            {cartCount > 0 ? (
              <Badge bg="danger" pill className="mobile-tab-badge">
                {cartCount}
              </Badge>
            ) : null}
          </span>
          <span>Cart</span>
        </Link>
        {userData ? (
          showAdminNavigation ? (
            <Link
              to="/dashboard-admin"
              className={`mobile-tab ${
                isActivePath("/dashboard-admin") ? "is-active" : ""
              }`}
              onClick={handleNavItemClick}
            >
              <Settings size={22} />
              <span>Dashboard</span>
            </Link>
          ) : (
            <Link
              to="/inquiries"
              className={`mobile-tab ${
                isActivePath("/inquiries") ? "is-active" : ""
              }`}
              onClick={handleNavItemClick}
            >
              <FileText size={22} />
              <span>Inquiries</span>
            </Link>
          )
        ) : (
          <button
            type="button"
            className="mobile-tab"
            onClick={openAccountLogin}
          >
            <LogIn size={22} />
            <span>Login</span>
          </button>
        )}
      </nav>

      {isAdmin ? (
        <>
          <Button
            type="button"
            className="mobile-admin-fab"
            onClick={() => setShowAdminTools(true)}
            aria-label="Open admin tools"
          >
            <Settings size={20} />
            {showAdminNavigation && processingCount > 0 ? (
              <Badge bg="danger" pill className="mobile-admin-badge">
                {processingCount}
              </Badge>
            ) : null}
          </Button>

          <Offcanvas
            show={showAdminTools}
            onHide={() => setShowAdminTools(false)}
            placement="end"
            className="mobile-admin-drawer"
          >
            <Offcanvas.Header closeButton>
              <Offcanvas.Title>Admin Tools</Offcanvas.Title>
            </Offcanvas.Header>
            <Offcanvas.Body>
              <div className="mobile-admin-view-toggle">
                <span>View website as</span>
                <div
                  className="admin-view-toggle"
                  role="group"
                  aria-label="Admin view mode"
                >
                  <button
                    type="button"
                    className={isCustomerView ? "is-active" : ""}
                    onClick={() => changeAdminViewMode("customer")}
                  >
                    Customer
                  </button>
                  <button
                    type="button"
                    className={!isCustomerView ? "is-active" : ""}
                    onClick={() => changeAdminViewMode("admin")}
                  >
                    Admin
                  </button>
                </div>
              </div>
              <div className="mobile-admin-links">
                {showAdminNavigation ? (
                  adminUtilityLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="mobile-admin-link"
                    onClick={handleNavItemClick}
                  >
                    <span>{link.label}</span>
                    {link.count > 0 ? (
                      <Badge bg="danger" pill>
                        {link.count}
                      </Badge>
                    ) : null}
                  </Link>
                  ))
                ) : (
                  <div className="mobile-admin-customer-note">
                    Customer view is active. Switch to Admin view to show admin tools.
                  </div>
                )}
              </div>
            </Offcanvas.Body>
          </Offcanvas>
        </>
      ) : null}

      <AccountModal
        show={showAccountModal}
        initialMode={accountMode}
        onHide={() => setShowAccountModal(false)}
      />
    </>
  );
}

export default AppNavbar;
