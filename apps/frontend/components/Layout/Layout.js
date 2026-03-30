import Header from "../Header/Header";
import Sidebar from "../Sidebar/Sidebar";
import Footer from "../Footer/Footer";

export default function Layout({ children, user }) {
  return (
    <div className="app-layout">
      <Header user={user} />
      <Sidebar />
      <main className="app-main">
        <div className="app-content">
          {children}
        </div>
        <Footer />
      </main>
      <div className="mesh-accent" />
    </div>
  );
}
