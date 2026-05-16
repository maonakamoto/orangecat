import React from 'react';
import { Metadata } from 'next';
import { Briefcase, Users, Zap, Heart, Globe, Coffee } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GRADIENTS } from '@/config/gradients';

export const metadata: Metadata = {
  title: 'Careers — Join Our Mission',
  description:
    'Work with us to build universal economic participation. Join OrangeCat and help anyone — any identity, any currency — earn, fund, invest, and govern freely.',
};

export default function CareersPage() {
  const openPositions = [
    {
      title: 'Senior Bitcoin Developer',
      department: 'Engineering',
      location: 'Remote / Switzerland',
      type: 'Full-time',
      description:
        'Build Bitcoin-native applications and integrations. Experience with Lightning Network, NWC, and BTCPay Server preferred.',
    },
    {
      title: 'Community Manager',
      department: 'Operations',
      location: 'Remote',
      type: 'Full-time',
      description:
        'Help grow and nurture communities of creators, researchers, entrepreneurs, and groups using OrangeCat worldwide.',
    },
    {
      title: 'Product Designer',
      department: 'Design',
      location: 'Remote / Switzerland',
      type: 'Full-time',
      description:
        'Design intuitive interfaces for economic participation — from funding to governance to AI-assisted workflows.',
    },
    {
      title: 'DevRel Engineer',
      department: 'Engineering',
      location: 'Remote',
      type: 'Full-time',
      description:
        'Build developer tools, documentation, and community around the OrangeCat platform and Cat agent ecosystem.',
    },
  ];

  const values = [
    {
      icon: <Heart className="w-6 h-6" />,
      title: 'Open Economic Access',
      description:
        'We believe any person, pseudonym, or organization should be able to participate in the full economic spectrum — without gatekeepers.',
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Community Driven',
      description:
        'Our success depends on the communities we serve. We listen, learn, and build together.',
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'Always Day 1',
      description:
        'We maintain an entrepreneurial mindset, staying agile and innovative in everything we do.',
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: 'Global Impact',
      description:
        'Our work empowers creators, communities, and individuals worldwide to participate economically — in any currency, under any identity.',
    },
  ];

  const perks = [
    '100% Remote Work',
    'Competitive Bitcoin Compensation',
    'Health & Dental Coverage',
    'Unlimited PTO',
    'Learning & Development Budget',
    'Bitcoin Conference Attendance',
    'Home Office Stipend',
    'Flexible Hours',
  ];

  return (
    <div className={cn(GRADIENTS.pageBgSolid, 'min-h-screen')}>
      {/* Hero Section */}
      <div className="bg-white dark:bg-card border-b border-gray-200 dark:border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-8">
              <Briefcase className="w-8 h-8 text-orange-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-foreground sm:text-5xl mb-4">
              Join <span className="text-orange-600">OrangeCat</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-muted-foreground max-w-3xl mx-auto">
              Help us build universal economic participation. Work on a platform that lets anyone —
              any identity, any currency — earn, fund, invest, and govern freely.
            </p>
          </div>
        </div>
      </div>

      {/* Our Mission */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-foreground mb-6">
            Why OrangeCat?
          </h2>
          <p className="text-lg text-gray-600 dark:text-muted-foreground max-w-4xl mx-auto">
            We&apos;re not just building software — we&apos;re creating infrastructure for open
            economic participation. Bitcoin-native and any-currency-first, with an AI agent (the
            Cat) that acts on behalf of every user. Every role at OrangeCat contributes to this
            mission.
          </p>
        </div>

        {/* Values */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {values.map((value, index) => (
            <div key={index} className="text-center p-6 bg-white dark:bg-card rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-600">
                {value.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-foreground mb-2">
                {value.title}
              </h3>
              <p className="text-gray-600 dark:text-muted-foreground text-sm">
                {value.description}
              </p>
            </div>
          ))}
        </div>

        {/* Open Positions */}
        <div className="mb-16">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-foreground text-center mb-12">
            Open Positions
          </h2>

          {openPositions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {openPositions.map((position, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-card rounded-xl shadow-sm p-6 border border-gray-200 dark:border-border"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-foreground mb-1">
                        {position.title}
                      </h3>
                      <p className="text-orange-600 font-medium text-sm">{position.department}</p>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                      {position.type}
                    </span>
                  </div>

                  <p className="text-gray-600 dark:text-muted-foreground text-sm mb-4">
                    {position.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 dark:text-muted-foreground">
                      {position.location}
                    </span>
                    <button className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium">
                      Apply Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Coffee className="w-8 h-8 text-gray-400 dark:text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-foreground mb-2">
                No Open Positions Right Now
              </h3>
              <p className="text-gray-600 dark:text-muted-foreground mb-6">
                We&apos;re always growing! Send us your resume and we&apos;ll keep you in mind for
                future opportunities.
              </p>
              <button className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
                Send Your Resume
              </button>
            </div>
          )}
        </div>

        {/* Perks & Benefits */}
        <div className="bg-white dark:bg-card rounded-2xl shadow-lg p-8 mb-16">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-foreground text-center mb-8">
            Why Work With Us?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {perks.map((perk, index) => (
              <div key={index} className="flex items-center p-4 bg-orange-50 rounded-lg">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-orange-600 text-sm font-bold">✓</span>
                </div>
                <span className="text-gray-900 dark:text-foreground font-medium text-sm">
                  {perk}
                </span>
              </div>
            ))}
          </div>

          <div className="text-center">
            <p className="text-gray-600 dark:text-muted-foreground mb-6">
              We believe in compensating our team fairly with competitive salaries, Bitcoin bonuses,
              and benefits that support work-life balance.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-foreground mb-4">
            Ready to Join Our Mission?
          </h2>
          <p className="text-lg text-gray-600 dark:text-muted-foreground mb-8 max-w-2xl mx-auto">
            Whether we have an open position or not, we&apos;d love to hear from talented
            individuals who share our passion for open economic participation and Bitcoin.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium">
              View Open Positions
            </button>
            <button className="px-8 py-4 border border-orange-600 text-orange-600 rounded-lg hover:bg-orange-50 transition-colors font-medium">
              Send Your Resume
            </button>
          </div>

          <p className="text-sm text-gray-500 dark:text-muted-foreground mt-6">
            We are an equal opportunity employer and value diversity at our company. We do not
            discriminate on the basis of race, religion, color, national origin, gender, sexual
            orientation, age, marital status, veteran status, or disability status.
          </p>
        </div>
      </div>
    </div>
  );
}
