    def as_json(self):
        d = {c.name: getattr(self, c.name).isoformat() if (type(c.type) == SaDateTime) else getattr(self, c.name) for c in self.__table__.columns if type(c)}
        return json.dumps(d)
