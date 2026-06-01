import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import {
  BoxCubeIcon,
  CalenderIcon,
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  ListIcon,
  PageIcon,
  PieChartIcon,
  PlugInIcon,
  TableIcon,
  UserCircleIcon,
  LandmarkIcon, // 🏦 BANKING ICON
} from "../../icons";
import axios from "axios";
import { useSidebar } from "../../context/SidebarContext";
const navItems = [
  {
    icon: <GridIcon />,
    name: "Dashboard",
    path: "/",
  },

  {
    icon: <UserCircleIcon />,
    name: "Party Create",
    path: "/partyadd",
  },

  {
    name: "Invoicing & Billing",
    icon: <ListIcon />,
    subItems: [
      { name: "Bulk Sales Entry", path: "/income/bulk-sales" },
      { name: "Sales Entry", path: "/income/sales" },
      { name: "Purchase Entry", path: "/expense/purchase" },
      { name: "CN Note", path: "/voucher/CNNoteList" },
      { name: "DN Note", path: "/voucher/DNNoteList" },
      { name: "Console Bill", path: "/billing/console-bill", pro: false },
    ],
  },
  {
    icon: <ListIcon />,
    name: "Voucher",
    subItems: [
      { name: "Create Voucher", path: "/voucher/list" },
      // { name: "Receipt Voucher", path: "/voucher/receipt" },journalForm journalTable
      { name: "Journal", path: "/voucher/journal" },
      { name: "Third Party  Voucher", path: "/voucher/third-party-transfer" },
      { name: "Contra", path: "/voucher/contra" },

      { name: "TDS", path: "/TdsList" },
      { name: "Stock Master", path: "/voucher/stock-master" },
    ],
  },

  {
    icon: <TableIcon />,
    name: "Expense Entry",
    path: "/ExpensePage",
  },

  {
    icon: <ListIcon />,
    name: "Emp Management",
    path: "/EmployeeReportTable",
  },

  {
    icon: <ListIcon />,
    name: "Payrole",
    subItems: [
      { name: "Salary Generate", path: "/payrole-generate" },
      { name: "Salary Pay", path: "/payrole-pay" },
      { name: "Salary Report", path: "/payrole-list" },
    ],
  },
];

const Accounting = [
  ,
  {
    icon: <PageIcon />,
    name: "Accounting",
    subItems: [
      {
        name: "Ledger Management",
        path: "/ledger",
      },
      { name: "TrialBalance", path: "/TrialBalance" },
      { name: "Profit & Loss A/c", path: "/ProfitLoss" },
      { name: "BalanceSheet", path: "/BalanceSheet" },
    ],
  },

  {
    icon: <LandmarkIcon />,
    name: "Banking",
    subItems: [
      { name: "Cash Book", path: "/cashbook" },
      { name: "Bank Book", path: "/bankbook" },
      { name: "Bank Reconciliation", path: "/banking/bank-book" },
      { name: "Bank Statements", path: "/banking/bank-book" },
    ],
  },
];
const MasterItems = [
  {
    icon: <BoxCubeIcon />,
    name: "All Masters",
    subItems: [
      { name: "Country Master", path: "/masterscountry", pro: false },
      { name: "State Master", path: "/state", pro: false },
      { name: "City Master", path: "/city", pro: false },

      { name: "Pincode Master", path: "/pincode", pro: false },

      {
        icon: <BoxCubeIcon />,
        name: "Bank Master",
        path: "/bank-table",
        pro: false,
      },
      {
        icon: <BoxCubeIcon />,
        name: "Opening Balance Master",
        path: "/openingBalance",
        pro: false,
      },
      { name: " Expense Master ", path: "/Expense-master" },
      { name: "Expense type ", path: "/Expense-type" },
      {
        icon: <BoxCubeIcon />,
        name: "Unit Master",
        path: "/unit-master",
        pro: false,
      },
      {
        name: "Tax  Master",
        path: "/tax-master",
      },
      {
        name: "Gst  Master",
        path: "/gst-master",
      },
      {
        icon: <BoxCubeIcon />,
        name: "Item Master",
        path: "/item-master",
        pro: false,
      },

      {
        icon: <BoxCubeIcon />,
        name: "Department Master",
        path: "/Department-master",
      },
      {
        icon: <BoxCubeIcon />,
        name: "Designation Master ",
        path: "/Designation-master",
      },
      {
        icon: <BoxCubeIcon />,
        name: "FinancialYearMaster",
        path: "/FinancialYear",
      },
      {
        icon: <BoxCubeIcon />,
        name: "Prefix Master ",
        path: "/prefix",
      },
      {
        icon: <UserCircleIcon />,
        name: "Group",
        path: "/Group",
      },
      {
        icon: <UserCircleIcon />,
        name: "Shift master",
        path: "/shift",
      },
    ],
  },
];
const othersItems = [
  {
    icon: <BoxCubeIcon />,
    name: "Profle",
    path: "/profile",
    pro: false,
  },

  {
    icon: <BoxCubeIcon />,
    name: "Reset password",
    path: "/Grouap",
    pro: false,
  },
  {
    icon: <BoxCubeIcon />,
    name: "Logs",
    path: "/Groups",
    pro: false,
  },
  {
    icon: <BoxCubeIcon />,
    name: "Logout",
    logout: true,
    onClick: () => {
      localStorage.clear(); // or removeItem("token")
      sessionStorage.clear();

      window.location.href = "/login";
    },
  },
];
const ReportsItems = [
  /* ✅ NO DROPDOWN */
  {
    icon: <PageIcon />,
    name: "Sale Reports",
    path: "/report/sale",
  },

  /* ✅ NO DROPDOWN */
  {
    icon: <PageIcon />,
    name: "Purchase Reports",
    path: "/report/purchase",
  },

  /* ✅ NO DROPDOWN */
  {
    icon: <PageIcon />,
    name: "Expense Reports",
    path: "/report/expense",
  },

  {
    icon: <PageIcon />,
    name: "TDS Reports",
    path: "/report/tds",
  },
  {
    icon: <PageIcon />,
    name: "Voucher Reports",
    path: "/report/voucher",
  },
  {
    icon: <PageIcon />,
    name: "Creditnote Reports",
    path: "/report/credit-note",
  },
  {
    icon: <PageIcon />,
    name: "Debitnote Reports",
    path: "/report/debit-note",
  },
  {
    icon: <PageIcon />,
    name: "Contra Reports",
    path: "/report/contra",
  },

  {
    icon: <PageIcon />,
    name: "Reports & Analytics",
    subItems: [
      {
        name: "Day Book",
        path: "/reports/day-book",
      },
      {
        name: "Ledger Report",
        path: "/reports/ledger",
      },
      {
        name: "Cash Flow Statement",
        path: "/reports/cash-flow",
      },
      {
        name: "Expense Summary",
        path: "/reports/expense-summary",
      },
      {
        name: "GST Summary",
        path: "/reports/gst-summary",
      },
    ],
  },

  /* GST REPORTS */
  {
    icon: <PageIcon />,
    name: "GST Reports",
    subItems: [
      {
        name: "GSTR-1",
        path: "/report/gstr1",
      },
      {
        name: "GSTR-2B",
        path: "/report/gstr2b",
      },
      {
        name: "GSTR-3B",
        path: "/report/gstr3b",
      },
      {
        name: "GSTR-9",
        path: "/report/gstr9",
      },
    ],
  },
];
const AppSidebar = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const location = useLocation();
  const [companyLogo, setCompanyLogo] = useState(null);
  const [openSubmenu, setOpenSubmenu] = useState(null);
  const [subMenuHeight, setSubMenuHeight] = useState({});
  const subMenuRefs = useRef({});

  // const isActive = (path: string) => location.pathname === path;
  const isActive = useCallback(
    (path) => location.pathname === path,
    [location.pathname],
  );

  useEffect(() => {
    let submenuMatched = false;
    ["main", "others", "Masters", "Accounting", "Reports"].forEach(
      (menuType) => {
        const items =
          menuType === "main"
            ? navItems
            : menuType === "others"
              ? othersItems
              : menuType === "Masters"
                ? MasterItems
                : menuType === "Accounting"
                  ? Accounting
                  : ReportsItems;
        items.forEach((nav, index) => {
          if (nav.subItems) {
            nav.subItems.forEach((subItem) => {
              if (isActive(subItem.path)) {
                setOpenSubmenu({
                  type: menuType,
                  index,
                });
                submenuMatched = true;
              }
            });
          }
        });
      },
    );

    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [location, isActive]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index, menuType) => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  const renderMenuItems = (items, menuType) => (
    <ul className="flex flex-col whitespace-nowrap">
      {items.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group ${openSubmenu?.type === menuType && openSubmenu?.index === index
                ? "menu-item-active"
                : "menu-item-inactive"
                } cursor-pointer ${!isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "lg:justify-start"
                }`}
            >
              <span
                className={`menu-item-icon-size  ${openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-icon-active"
                  : "menu-item-icon-inactive"
                  }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text">{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={`ml-auto w-5 h-5 transition-transform duration-200 ${openSubmenu?.type === menuType &&
                    openSubmenu?.index === index
                    ? "rotate-180 text-brand-500"
                    : ""
                    }`}
                />
              )}
            </button>
          ) : nav.logout ? (
            <button
              onClick={nav.onClick}
              className="menu-item group text-red-600 hover:bg-red-50 w-full"
            >
              <span className="menu-item-icon-size text-red-600">
                {nav.icon}
              </span>

              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text">{nav.name}</span>
              )}
            </button>
          ) : nav.path ? (
            <Link
              to={nav.path}
              className={`menu-item group ${isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                }`}
            >
              <span
                className={`menu-item-icon-size ${isActive(nav.path)
                  ? "menu-item-icon-active"
                  : "menu-item-icon-inactive"
                  }`}
              >
                {nav.icon}
              </span>

              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text">{nav.name}</span>
              )}
            </Link>
          ) : null}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-2 space-y-1 ml-2">
                {nav.subItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link
                      to={subItem.path}
                      className={`menu-dropdown-item ${isActive(subItem.path)
                        ? "menu-dropdown-item-active"
                        : "menu-dropdown-item-inactive"
                        }`}
                    >
                      {subItem.name}
                      <span className="flex items-center gap-1 ml-auto">
                        {subItem.new && (
                          <span
                            className={`ml-auto ${isActive(subItem.path)
                              ? "menu-dropdown-badge-active"
                              : "menu-dropdown-badge-inactive"
                              } menu-dropdown-badge`}
                          >
                            new
                          </span>
                        )}
                        {subItem.pro && (
                          <span
                            className={`ml-auto ${isActive(subItem.path)
                              ? "menu-dropdown-badge-active"
                              : "menu-dropdown-badge-inactive"
                              } menu-dropdown-badge`}
                          >
                            pro
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  useEffect(() => {
    const fetchCompanyLogo = async () => {
      try {
        const token = localStorage.getItem("company_token");
        if (!token) return;

        const res = await axios.get(
          `${import.meta.env.VITE_SERVER_URL}/api/company/me`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (res.data.success && res.data.data.logo) {
          setCompanyLogo(
            `${import.meta.env.VITE_SERVER_URL}/${res.data.data.logo.replace(
              /\\/g,
              "/",
            )}`,
          );
        }
      } catch (err) {
        console.error("Sidebar logo fetch failed");
      }
    };

    fetchCompanyLogo();
  }, []);

  return (
    <aside
      // className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-0 left-0 bg-gray-900 border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200
      className={`fixed  flex flex-col  top-0 px-0 left-0 bg-[#F6F6F6] border-gray-100 text-gray-900 h-screen transition-all duration-300 ease-in-out z-100 border-r border-gray-200 
          ${isExpanded || isMobileOpen
          ? "w-[220px]"
          : // ? "w-[290px]"

          isHovered
            ? "w-[220px]"
            : // ? "w-[290px]"
            "w-[90px]"
        }
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-3 flex bg-white  mb-6  ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
          }`}
      >
        <Link to="/">
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <img
                className="dark:hidden bg-white ml-6 object-contain"
                src={companyLogo || "/images/logo/kingfish-logo.webp"}
                alt="Logo"
                width={150}
                height={40}
              />
              <img
                className="hidden dark:block  bg-white"
                src={companyLogo || "/images/logo/kingfish-logo.webp"}
                alt="Logo"
                width={150}
                height={40}
              />
            </>
          ) : (
            <img
              className="bg-white"
              src={companyLogo || "/images/logo/kingfish-logo.webp"}
              alt="Logo"
              width={32}
              height={32}
            />
          )}
        </Link>
      </div>

      {/* <div className="flex flex-col px-5 overflow-y-auto duration-300 ease-linear no-scrollbar"> */}
      <div className="flex  px-2 overflow-y-auto  no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-800 ${!isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "justify-start"
                  }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Menu"
                ) : (
                  <HorizontaLDots className="size-6" />
                )}
              </h2>
              {renderMenuItems(navItems, "main")}
            </div>
            <div className="">
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-800 ${!isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "justify-start"
                  }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Accounting "
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              {renderMenuItems(Accounting, "Accounting")}
            </div>

            <div className="">
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-800 ${!isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "justify-start"
                  }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Masters"
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              {renderMenuItems(MasterItems, "Masters")}
            </div>
            <div className="">
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-800 ${!isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "justify-start"
                  }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Reports"
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              {renderMenuItems(ReportsItems, "Reports")}
            </div>
            <div className="">
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-800 ${!isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "justify-start"
                  }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "others"
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              {renderMenuItems(othersItems, "others")}
            </div>
          </div>
        </nav>
        {/* {isExpanded || isHovered || isMobileOpen ? <SidebarWidget /> : null} */}
      </div>
    </aside>
  );
};
export default AppSidebar;
