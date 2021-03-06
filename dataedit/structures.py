from sqlalchemy import BigInteger, Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Table, Text, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.schema import PrimaryKeyConstraint
from sqlalchemy.orm import relationship
Base = declarative_base()
metadata = Base.metadata




class Tag(Base):
    __tablename__ = 'tags'
    __table_args__ = {'schema': 'public'}

    id = Column(BigInteger, primary_key=True, server_default=text("nextval('\"public\".tags_id_seq'::regclass)"))
    name = Column(String(40))
    color = Column(Integer)

class Table_tags(Base):
    __table_args__ = {'schema': 'public'}
    __tablename__ = 'table_tags'
    __table_args__ = (
        PrimaryKeyConstraint('tag', 'schema_name', 'table_name'),
    )
    tag = Column(ForeignKey(Tag.id))
    schema_name = Column(String(100))
    table_name = Column(String(100))