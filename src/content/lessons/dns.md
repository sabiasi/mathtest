Computers on the internet find each other with numbers called **[IP addresses](term:ip-address)**, like `93.184.215.14`. Humans prefer names like `example.com`. **[DNS](term:dns)** (Domain Name System) is the internet's phone book that turns names into numbers.

## What happens when you type a name

1. Your computer checks its own memory (its **cache**): "Have I looked this up recently?"
2. If not, it asks a **DNS resolver**, usually run by your internet provider.
3. The resolver asks around: first the **root** servers ("who handles `.com`?"), then the `.com` servers ("who handles `example.com`?"), then `example.com`'s own DNS server ("what's the address?").
4. The answer comes back and is cached for next time, often for minutes or hours.

All of this usually takes a few milliseconds.

## Try it

In the terminal:

```bash
nslookup example.com
```

You'll see the IP address the name points to.

## Why it matters to you

When you [deploy](/roadmap/deployment) a project with your own domain name, you'll add **DNS records** that point the name at your server. And when a site "can't be found", a DNS problem is a common cause.

## Key takeaways

- **IP addresses** are numbers; **DNS** turns names into them.
- Lookups are **cached**, so changes can take a while to spread.
- You'll edit DNS records when you give a project its own domain.
