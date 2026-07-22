import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.tsx'
import Home from './pages/Home.tsx'
import About from './pages/About.tsx'
import VirtualTour from './pages/VirtualTour.tsx'
import GalleryPage from './pages/GalleryPage.tsx'
import HotelsList from './pages/HotelsList.tsx'
import HotelDetail from './pages/HotelDetail.tsx'
import BanquetsList from './pages/BanquetsList.tsx'
import BanquetDetail from './pages/BanquetDetail.tsx'
import Corporate from './pages/Corporate.tsx'
import Restaurant from './pages/Restaurant.tsx'
import CateringDetail from './pages/CateringDetail.tsx'
import Contact from './pages/Contact.tsx'
import Login from './pages/Login.tsx'
import Register from './pages/Register.tsx'
import NotFound from './pages/NotFound.tsx'
import AdminDashboard from './pages/AdminDashboard.tsx'

export default function App() {
  return (
    <Routes>
      <Route path="/admin" element={<AdminDashboard />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about-us" element={<About />} />
        <Route path="/virtual-tour" element={<VirtualTour />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/hotels" element={<HotelsList />} />
        <Route path="/hotels/:slug" element={<HotelDetail />} />
        <Route path="/banquets" element={<BanquetsList />} />
        <Route path="/banquets/:slug" element={<BanquetDetail />} />
        <Route path="/corporate-hotel-booking" element={<Corporate />} />
        <Route path="/restaurant" element={<Restaurant />} />
        <Route path="/restaurant/outdoor-catering-service" element={<CateringDetail />} />
        <Route path="/contactus" element={<Contact />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
