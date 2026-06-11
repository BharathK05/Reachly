import io
import csv
from datetime import date, datetime, timedelta
from fastapi import APIRouter, HTTPException, UploadFile, File
from db.client import get_supabase

router = APIRouter(prefix="/api/data", tags=["data"])


def _parse_date(val: str) -> str | None:
    """Try multiple date formats and return ISO date string or None."""
    if not val:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(val.strip(), fmt).date().isoformat()
        except ValueError:
            continue
    return None


@router.post("/upload")
async def upload_data(
    customers_file: UploadFile = File(...),
    orders_file: UploadFile = File(...),
):
    """
    Accept customers.csv and orders.csv, parse and upsert into Supabase.
    customers.csv expected columns: id, name, email, phone, tier
    orders.csv expected columns: id, customer_id, product, qty, price, order_date
    Derives: total_spend, order_count, last_purchase_date, days_since_last_purchase per customer.
    """
    supabase = get_supabase()

    # ── Parse customers.csv ─────────────────────────────────────────────────
    try:
        customers_content = await customers_file.read()
        customers_text = customers_content.decode("utf-8-sig")
        customers_reader = csv.DictReader(io.StringIO(customers_text))
        customers = [row for row in customers_reader]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse customers.csv: {e}")

    # ── Parse orders.csv ────────────────────────────────────────────────────
    try:
        orders_content = await orders_file.read()
        orders_text = orders_content.decode("utf-8-sig")
        orders_reader = csv.DictReader(io.StringIO(orders_text))
        orders = [row for row in orders_reader]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse orders.csv: {e}")

    # ── Derive aggregate stats per customer ──────────────────────────────────
    from collections import defaultdict
    spend_map: dict[str, float] = defaultdict(float)
    count_map: dict[str, int] = defaultdict(int)
    last_date_map: dict[str, date] = {}

    today = date.today()
    clean_orders = []
    for o in orders:
        cid = o.get("customer_id", "").strip()
        if not cid:
            continue
        try:
            price = float(o.get("price", 0))
            qty = int(o.get("qty", 1))
        except (ValueError, TypeError):
            price, qty = 0.0, 1

        order_date_str = _parse_date(o.get("order_date", ""))
        order_date_obj = date.fromisoformat(order_date_str) if order_date_str else today

        spend_map[cid] += price * qty
        count_map[cid] += 1
        if cid not in last_date_map or order_date_obj > last_date_map[cid]:
            last_date_map[cid] = order_date_obj

        clean_orders.append({
            "id": o.get("id") or None,
            "customer_id": cid,
            "product": o.get("product", "").strip(),
            "qty": qty,
            "price": price,
            "order_date": order_date_obj.isoformat(),
        })

    # ── Build customer upsert payload ────────────────────────────────────────
    valid_tiers = {"Gold", "Silver", "Bronze"}
    clean_customers = []
    for c in customers:
        cid = c.get("id", "").strip() or None
        tier_raw = c.get("tier", "").strip()
        tier = tier_raw if tier_raw in valid_tiers else "Bronze"
        cid_key = cid or c.get("name", "").strip()
        last_purchase = last_date_map.get(cid_key)
        days_since = (today - last_purchase).days if last_purchase else None

        clean_customers.append({
            "id": cid,
            "name": c.get("name", "").strip(),
            "email": c.get("email", "").strip() or None,
            "phone": c.get("phone", "").strip() or None,
            "tier": tier,
            "total_spend": round(spend_map.get(cid_key, 0), 2),
            "order_count": count_map.get(cid_key, 0),
            "last_purchase_date": last_purchase.isoformat() if last_purchase else None,
            "days_since_last_purchase": days_since,
        })

    # ── Upsert customers ─────────────────────────────────────────────────────
    try:
        if clean_customers:
            # Remove None IDs (will be auto-generated)
            for_insert = []
            for_upsert = []
            for c in clean_customers:
                if c["id"]:
                    for_upsert.append(c)
                else:
                    c_copy = {k: v for k, v in c.items() if k != "id"}
                    for_insert.append(c_copy)

            if for_upsert:
                supabase.table("customers").upsert(for_upsert, on_conflict="id").execute()
            if for_insert:
                supabase.table("customers").insert(for_insert).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upsert customers: {e}")

    # ── Upsert orders ─────────────────────────────────────────────────────────
    try:
        if clean_orders:
            for_insert = []
            for_upsert = []
            for o in clean_orders:
                if o["id"]:
                    for_upsert.append(o)
                else:
                    o_copy = {k: v for k, v in o.items() if k != "id"}
                    for_insert.append(o_copy)
            if for_upsert:
                supabase.table("orders").upsert(for_upsert, on_conflict="id").execute()
            if for_insert:
                supabase.table("orders").insert(for_insert).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upsert orders: {e}")

    return {
        "message": "Data uploaded successfully.",
        "customers_processed": len(clean_customers),
        "orders_processed": len(clean_orders),
    }


@router.get("/stats")
async def get_stats():
    """Return aggregate dataset statistics."""
    supabase = get_supabase()
    try:
        customers_res = supabase.table("customers").select("id, total_spend, days_since_last_purchase, tier").execute()
        customers = customers_res.data or []

        orders_res = supabase.table("orders").select("id").execute()
        order_count = len(orders_res.data or [])

        customer_count = len(customers)
        total_revenue = sum(c.get("total_spend", 0) or 0 for c in customers)
        avg_spend = round(total_revenue / customer_count, 2) if customer_count else 0

        inactive = [c for c in customers if (c.get("days_since_last_purchase") or 0) >= 45]
        inactive_count = len(inactive)
        premium_inactive = [c for c in inactive if c.get("tier") in ("Gold", "Silver")]
        premium_inactive_count = len(premium_inactive)

        # Product breakdown from orders
        orders_full = supabase.table("orders").select("product, price, qty").execute().data or []
        product_revenue: dict[str, float] = {}
        for o in orders_full:
            p = o.get("product", "Unknown")
            rev = (o.get("price") or 0) * (o.get("qty") or 1)
            product_revenue[p] = product_revenue.get(p, 0) + rev

        top_products = sorted(
            [{"product": k, "revenue": round(v, 2)} for k, v in product_revenue.items()],
            key=lambda x: x["revenue"],
            reverse=True,
        )[:7]

        # Tier breakdown
        tier_counts: dict[str, int] = {}
        for c in customers:
            t = c.get("tier", "Bronze") or "Bronze"
            tier_counts[t] = tier_counts.get(t, 0) + 1

        return {
            "customer_count": customer_count,
            "order_count": order_count,
            "total_revenue": round(total_revenue, 2),
            "average_spend": avg_spend,
            "inactive_count": inactive_count,
            "premium_inactive_count": premium_inactive_count,
            "top_products": top_products,
            "tier_breakdown": tier_counts,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {e}")


@router.get("/customers")
async def list_customers(search: str = "", limit: int = 100, offset: int = 0):
    """List customers with optional search across name, email, phone, tier."""
    supabase = get_supabase()
    try:
        query = supabase.table("customers").select(
            "id, name, email, phone, tier, total_spend, order_count, days_since_last_purchase, last_purchase_date"
        )
        # Server-side search across name, email, phone
        if search:
            query = query.or_(
                f"name.ilike.%{search}%,email.ilike.%{search}%,phone.ilike.%{search}%,tier.ilike.%{search}%"
            )
        result = query.order("total_spend", desc=True).range(offset, offset + limit - 1).execute()
        customers = result.data or []

        # Total count (separate query for pagination)
        count_query = supabase.table("customers").select("id", count="exact")
        if search:
            count_query = count_query.or_(
                f"name.ilike.%{search}%,email.ilike.%{search}%,phone.ilike.%{search}%,tier.ilike.%{search}%"
            )
        count_res = count_query.execute()
        total = count_res.count or len(customers)

        return {"customers": customers, "total": total}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch customers: {e}")


@router.get("/customers/{customer_id}")
async def get_customer(customer_id: str):
    """Get a single customer with their recent orders."""
    supabase = get_supabase()
    try:
        cust_res = supabase.table("customers").select("*").eq("id", customer_id).single().execute()
        customer = cust_res.data
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")

        orders_res = (
            supabase.table("orders")
            .select("id, product, qty, price, order_date")
            .eq("customer_id", customer_id)
            .order("order_date", desc=True)
            .limit(20)
            .execute()
        )
        return {"customer": customer, "orders": orders_res.data or []}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch customer: {e}")


@router.get("/orders")
async def list_orders(search: str = "", limit: int = 100, offset: int = 0):
    """List recent orders with customer name."""
    supabase = get_supabase()
    try:
        # Join with customers for name
        query = supabase.table("orders").select(
            "id, product, qty, price, order_date, customer_id, customers(name, tier)"
        )
        if search:
            query = query.ilike("product", f"%{search}%")
        result = query.order("order_date", desc=True).range(offset, offset + limit - 1).execute()

        count_res = supabase.table("orders").select("id", count="exact").execute()
        total = count_res.count or 0

        return {"orders": result.data or [], "total": total}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch orders: {e}")

