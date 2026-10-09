"""Repository layer untuk modul Auth.

Menangani interaksi database untuk user profiles, customers, dan audit log.
"""

import uuid

from sqlalchemy.orm import Session

from app.core.audit import write_audit_log
from app.core.dependencies import UserProfile
from app.core.models import Customer

SENTINEL_PERSONNEL_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


def get_user_profile_by_auth_id(
    db: Session, auth_user_id: uuid.UUID
) -> UserProfile | None:
    """Cari UserProfile berdasarkan auth_user_id."""
    return (
        db.query(UserProfile)
        .filter(UserProfile.auth_user_id == auth_user_id)
        .first()
    )


def get_customer_by_phone(db: Session, no_hp: str) -> Customer | None:
    """Cari Customer berdasarkan nomor handphone."""
    return db.query(Customer).filter(Customer.no_hp == no_hp).first()


def create_customer_and_profile_with_audit(
    db: Session,
    auth_user_id: uuid.UUID,
    nama: str,
    no_hp: str,
) -> tuple[Customer, UserProfile]:
    """
    Buat data customer, user profile, dan catat audit log dalam satu transaksi atomik.
    """
    new_customer_id = uuid.uuid4()
    customer = Customer(
        customer_id=new_customer_id,
        nama=nama,
        no_hp=no_hp,
    )
    db.add(customer)
    db.flush()

    profile = UserProfile(
        auth_user_id=auth_user_id,
        entity_type="customer",
        entity_id=customer.customer_id,
    )
    db.add(profile)

    write_audit_log(
        session=db,
        personnel_id=SENTINEL_PERSONNEL_ID,
        action="create",
        table_name="customers",
        record_id=customer.customer_id,
        detail={"nama": nama, "no_hp": no_hp},
    )

    db.commit()
    db.refresh(customer)
    db.refresh(profile)
    return customer, profile
