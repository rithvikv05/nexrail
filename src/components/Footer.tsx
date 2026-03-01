import { Train } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t bg-card mt-12">
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Train className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-foreground">NexRail</span>
            </div>
            <p className="text-sm text-muted-foreground">Your trusted partner for train travel across India.</p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-3 text-sm">Services</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="hover:text-foreground cursor-pointer transition-colors">Book Tickets</p>
              <p className="hover:text-foreground cursor-pointer transition-colors">PNR Status</p>
              <p className="hover:text-foreground cursor-pointer transition-colors">Live Train Status</p>
              <p className="hover:text-foreground cursor-pointer transition-colors">Train Schedule</p>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-3 text-sm">Company</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="hover:text-foreground cursor-pointer transition-colors">About Us</p>
              <p className="hover:text-foreground cursor-pointer transition-colors">Contact</p>
              <p className="hover:text-foreground cursor-pointer transition-colors">Careers</p>
              <p className="hover:text-foreground cursor-pointer transition-colors">Blog</p>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-3 text-sm">Legal</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="hover:text-foreground cursor-pointer transition-colors">Privacy Policy</p>
              <p className="hover:text-foreground cursor-pointer transition-colors">Terms of Service</p>
              <p className="hover:text-foreground cursor-pointer transition-colors">Refund Policy</p>
            </div>
          </div>
        </div>
        <div className="border-t mt-8 pt-6 text-center text-sm text-muted-foreground">
          © 2026 NexRail. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
